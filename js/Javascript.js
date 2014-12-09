$(document).ready(function() {

    var width = 1000;
    var height = 600;

    var rootRef = new Firebase('https://sessionhandler-db.firebaseio.com/');

    //Choose a random whiteboard
    var boardId = window.location.hash.replace(/#/g, '') || rootRef.push().name();
    var wurl = window.location.toString().replace(/#.*/, '') + '#' + boardId;
    window.location = wurl;
    $("#toolbar").append("<a style='float: right; margin-top: 4px; margin-right: 10px;'></a>");

    //if the hash changes again, reload the page
    setTimeout(function() {
        $(window).on('hashchange', function() {
            window.location.reload();
        });
    }, 0);

    var possibleNames = ["Joe", "Jenny", "Bob", "Frank", "Sally", "Anne",
        "James", "Gretchen", "Tammy", "Hodor", "Brian", "Jennifer", "Jill", "Jen"];
    var randNameInd = Math.floor(Math.random()*possibleNames.length);
    var username = possibleNames[randNameInd];

    // boardRef = parent, nuværende session
    var boardRef = rootRef.child(boardId);
    // reference til Firebase - hiver fat i layers
    var layersRef = boardRef.child('layers');
    // reference til Firebase - hiver fat i users
    var usersRef = boardRef.child('users');
    // reference til Firebase - den enkelte user (en selv, sådenset)
    var userRef = usersRef.child(username);

    // Tildel canvas-element til en variabel
    var $body = $("body");
    var $bottomCanvas = $('#bottom');
    var $topCanvas = $('#top');

    // Få adgang til DOM-elementerne ^
    var bottomCanvas = $bottomCanvas.get(0);
    var topCanvas = $topCanvas.get(0);

    // Få adgang til 2d-contexten (rendering til HTML5-canvas)
    var bottomCtx = bottomCanvas.getContext('2d');
    var topCtx = topCanvas.getContext('2d');

    var newLayer;

    // View:

    var clear = function(ctx) {
        ctx.clearRect(0, 0, width, height);
    };

    var drawLayer = function(ctx, layer) {
        ctx.beginPath();
        ctx.lineWidth = layer.thickness;
        ctx.strokeStyle = layer.color;
        ctx.moveTo(layer.points[0].x, layer.points[0].y);
        _.each(_.rest(layer.points, 1), function(point) {
            ctx.lineTo(point.x, point.y);
        });
        ctx.stroke();
    };

    var showNewLayer = function() {
        clear(topCtx);
        drawLayer(topCtx, newLayer);
    };

    var drawChild = function(snapshot) {
        drawLayer(bottomCtx, snapshot.val());
    };

    var redraw = function() {
        clear(bottomCtx);
        layersRef.once('value', function(snapshot) {
            snapshot.forEach(drawChild);
        });
    };

    //Loop der checker på ændring og tilføjelse af canvas
    layersRef.on('child_added', drawChild);
    layersRef.on('child_removed', redraw);

    usersRef.on('child_changed', function(snapshot) {
        var name = snapshot.name();
        var user = snapshot.val();

        // lav dynamisk brugerID
        id = "cursor_"+name;
        var $cursor = $("#"+id);
        var $cursorPrt = $('#cursorPrt');
        if(!$cursor.length) {
            //
            $cursor = $('<div>').attr('id', id).addClass('cursor').text(name)
                .appendTo('body');
        }

        $cursorPrt.html(user.cursorPoint.x + ", " + (user.cursorPoint.y - 40));
        $cursor.css('left', user.cursorPoint.x).css('top', user.cursorPoint.y);
    });

    usersRef.on('child_removed', function(snapshot) {
        $("#cursor_"+snapshot.name()).remove();
    });

    // User input:

    userRef.removeOnDisconnect();

    $topCanvas.on('mousedown', function(e) {
        // Tjekker om farven er hvid - i så fald funger som hviskelæder


        if ("#FFFFFF" === $("input[name=brush]:checked").attr('color'))
        {
            console.log("down");
            newLayer = {
                points: [{x: e.pageX, y: e.pageY}],
                color: $("input[name=brush]:checked").attr('color'),
                thickness: 25
            };
        } else
        {
            console.log("down");
            newLayer = {
                points: [{x: e.pageX, y: e.pageY}],
                color: $("input[name=brush]:checked").attr('color'),
                thickness: $("input[name=thickness]:checked").attr('size')
            };
        }


        var now = function() { return new Date().getTime() };
        var last = 0;
        $body.on('mousemove.brush', function(e) {
            if(last < now() - 20) {
                newLayer.points.push({x: e.pageX, y: e.pageY});
                showNewLayer();
                last = now();
            }
        });

        // Når musen løftes fra body-elementet, pushes det nye layer til Firebase
        $body.one('mouseup', function(e) {
            $body.off('mousemove.brush');
            // Push
            layersRef.push(newLayer);
            clear(topCtx);
        });
    });

    $topCanvas.on(
        'mousemove',
        _.throttle(function(e) {
            userRef.child('cursorPoint').set({x: e.pageX, y: e.pageY});
        }, 30)
    );


    $("#new").on('click', function() {
        window.location = "index.html";
    });

    $("#clear").on('click', function() {
        layersRef.remove();
    });

    $("#undo").on('click', function() {
        var query = layersRef.limit(1);
        query.once('child_added', function(snapshot) {
            layersRef.child(snapshot.name()).remove();
        });
    });

    // prevent text cursor from showing up as you draw
    topCanvas.onselectstart = function () { return false; };
});



// Sessions

// REST - Henter Databasens øverste-objekter med session-id og true (shallow=true)
// Brug AJAX til at hente JSON i stedet
$.getJSON('https://sessionhandler-db.firebaseio.com/.json', function(data) {
    $('#sessions').empty();
    console.log(data);

    var sessionId = 1;

    $.each(data, function(id, boolean){
        var img = document.createElement("img");
        //img.setAttribute("src", "window.location.toString().replace(/#.*/, '') + '#' + id");
        img.src = window.location.toString().replace(/#.*/, '') + '#' + id;
        img.width = 500;
        img.height = 300;

        //document.body.appendChild("<a href=#" + id + "> Session "+ sessionId + "</a>");
        document.body.appendChild(img);
        $('#sessions').append("<a href=#" + id + "> Session "+ sessionId + "</a>");
        //$('#sessions').append(img + "</br>");
        sessionId++;
    });

});
