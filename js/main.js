$(document).ready(function() {

    var width = 1000;
    var height = 600;
    var lineTool = false;
    var squareTool = false;

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

    //give new user random name
    var possibleNames = ["Pikachu", "Mario", "Yoshi", "Luigi", "Kirby", "Leonardo",
        "Hodor", "MegaMan", "Bowser", "Zelda", "Michelangelo", "Donatello", "Raphael", "DonkeyKong"];
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

    //Ændre navn. Først fjernes nuværende navn fra databasen,
    //inputtet bliver gemt i variablen username og en ny reference
    //til databasen bliver lavet
    $( "input[type='text']" ).change(function() {
        usersRef.child(username).remove();
        username = $("#nameInput").val();
        userRef = usersRef.child(username);
    });

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

    // Variabel der kommer til at gemme data over en streg og sendt til databasen
    var newLayer;

    // downloadJsonCanvas virker ikke endnu, men er sat op på HTML for nemhedens skyld.
    // downloadCanvas virker og gemmer nuværende canvas til sin computer som .png
    var downloadCanvas = function() {
        this.href = bottomCanvas.toDataURL('image/png');
    };

    var downloadJsonCanvas = function()
    {
        console.log("getBoardValues: " + getBoardValues);
        //console.log(getBoardValues.val());
        //console.log(this.boardRef.val());
        console.log(boardRef.val());
    }

    getCanvas.addEventListener('click', downloadCanvas, false);
    getJsonCanvas.addEventListener('click', downloadJsonCanvas, false);

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

    userRef.onDisconnect().remove();

    //mousedown event til at optage mouse events
    $topCanvas.on('mousedown', function(e) {
        // Tjekker om farven er hvid - i så fald funger som viskelæder
        if ($("input[name=brush]:checked").attr('color') === "#FFFFFF")
        {
            // her sættes free hand til true for at viskelæderet bruges frit.
            document.getElementById("white").checked = true;
            newLayer = {
                points: [{x: e.pageX, y: e.pageY}],
                color: $("input[name=brush]:checked").attr('color'),
                thickness: 25
            };
        } else
        {
            newLayer = {
                points: [{x: e.pageX, y: e.pageY}],
                color: $("input[name=brush]:checked").attr('color'),
                thickness: $("input[name=thickness]:checked").attr('size')
            };
        }

        //indtil videre arbejder vi kun med variablerne "lineTool" og "line"
        if ($("input[name=shape]:checked").attr('shape') === "lineTool")
        {
            lineTool = true;
        } else
        {
            lineTool = false;
        }

        if ($("input[name=shape]:checked").attr('shape') === "squareTool")
        {
            squareTool = true;
        } else
        {
            squareTool = false;
        }

        var now = function() { return new Date().getTime() };
        var last = 0;
        $body.on('mousemove.brush', function(e) {
            if (lineTool) {
                clear(topCtx);
                topCtx.beginPath();
                topCtx.lineWidth = newLayer.thickness;
                topCtx.strokeStyle = newLayer.color;
                topCtx.moveTo(newLayer.points[0].x, newLayer.points[0].y);
                topCtx.lineTo(e.pageX,   e.pageY);
                topCtx.stroke();
            } else if (squareTool)
            {
                var x = Math.min(e.pageX, newLayer.points[0].x);
                var y = Math.min(e.pageY, newLayer.points[0].y);
                var w = Math.abs(e.pageX - newLayer.points[0].x);
                var h = Math.abs(e.pageY - newLayer.points[0].y);

                console.log("x: " + x + ", y: " + y + ", w: " + w + ", h: " + h);

                topCtx.lineWidth = newLayer.thickness;
                topCtx.strokeStyle = newLayer.color;

                topCtx.clearRect(0, 0, width, height);

                if (!w || !h) {
                    return;
                }

                topCtx.strokeRect(x, y, w, h);
            } else if (last < now() - 20)
            {
                newLayer.points.push({x: e.pageX, y: e.pageY});
                showNewLayer();
                last = now();
            }

        });

        // Når musen løftes fra body-elementet, pushes det nye layer til Firebase
        $body.one('mouseup', function(e) {
            if (lineTool)
            {
                lineTool = false;
                newLayer.points.push({x: e.pageX, y: e.pageY});
            } else if (squareTool)
            {
                var mouseX = e.pageX;
                var mouseY = e.pageY;

                squareTool = false;

                newLayer.points.push({x: mouseX, y: newLayer.points[0].y});
                newLayer.points.push({x: mouseX, y: mouseY});
                newLayer.points.push({x: newLayer.points[0].x, y: mouseY});
                newLayer.points.push({x: newLayer.points[0].x, y: newLayer.points[0].y});
            }
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

    // Starter ny session
    $("#new").on('click', function() {
        window.location = "index.html";
    });

    // Rydder hele canvas
    $("#clear").on('click', function() {
        layersRef.remove();
    });

    // Fjerner brugerens seneste streg fra canvas
    $("#undo").on('click', function() {
        var query = layersRef.limit(1);
        query.once('child_added', function(snapshot) {
            //console.log(layersRef.child(snapshot.name()));
            layersRef.child(snapshot.name()).remove();
        });
    });

    // prevent text cursor from showing up as you draw
    topCanvas.onselectstart = function () { return false; };
});

// Sessions

// REST - Henter Databasens øverste-objekter med session-id og true (shallow=true)
// Udkast indtil videre.
// Brug AJAX til at hente JSON i stedet
$.getJSON('https://sessionhandler-db.firebaseio.com/.json', function(data) {
    $('#sessions').empty();

    var sessionId = 1;

    $.each(data, function(id, boolean){

        $('#sessions').append("<a href=#" + id + "> Session "+ sessionId + "</a>");
        sessionId++;
    });

});
