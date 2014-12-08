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

    var boardRef = rootRef.child(boardId);
    var layersRef = boardRef.child('layers');
    var usersRef = boardRef.child('users');
    var userRef = usersRef.child(username);

    var $body = $("body");

    var $bottomCanvas = $('#bottom');
    var $topCanvas = $('#top');

    var bottomCanvas = $bottomCanvas.get(0);
    var topCanvas = $topCanvas.get(0);

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
        console.log(layer.thickness);
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

    layersRef.on('child_added', drawChild);
    layersRef.on('child_removed', redraw);

    usersRef.on('child_changed', function(snapshot) {
        var name = snapshot.name();
        var user = snapshot.val();

        id = "cursor_"+name;
        var $cursor = $("#"+id);
        if(!$cursor.length) {
            $cursor = $('<div>').attr('id', id).addClass('cursor').text(name)
                .appendTo('body');
        }

        $cursor.css('left', user.cursorPoint.x).css('top', user.cursorPoint.y);
    });

    usersRef.on('child_removed', function(snapshot) {
        $("#cursor_"+snapshot.name()).remove();
    });

    // User input:

    userRef.removeOnDisconnect();

    $topCanvas.on('mousedown', function(e) {
        newLayer = {
            points: [{x: e.pageX, y: e.pageY}],
            color: $("input[name=brush]:checked").attr('color'),
            thickness: $("input[name=thickness]:checked").attr('size')
        };

        var now = function() { return new Date().getTime() };
        var last = 0;
        $body.on('mousemove.brush', function(e) {
            if(last < now() - 20) {
                newLayer.points.push({x: e.pageX, y: e.pageY});
                showNewLayer();
                last = now();
            }
        });

        $body.one('mouseup', function(e) {
            $body.off('mousemove.brush');
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
$.getJSON('https://sessionhandler-db.firebaseio.com/.json?shallow=true', function(data) {
    console.log(data);
    $('#sessions').empty();

    var sessionId = 1;

    $.each(data, function(id, boolean){
        $('#sessions').append("<a href=#" + id + "> Session "+ sessionId + "</a></br>");
        sessionId++;
    });

});
