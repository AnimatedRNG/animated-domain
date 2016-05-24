// Credit goes to Matt Muhic for this awesome Game of Life
// implementation: https://coderwall.com/p/irdyuq/conway-s-game-of-life-with-js-and-html5-canvas

var pixelSize = 8;
var numCellsH = 100;
var numCellsV = 40;
var canvas = document.getElementById('background');
var back = document.getElementsByTagName('article')[0]
canvas.width = pixelSize * numCellsH;
canvas.height = pixelSize * numCellsV;
var context = canvas.getContext('2d');
var arr = buildArr();

function buildArr() {
        var arr = [];
        for(var i = 0; i<numCellsH; i++) {
                var innerArr = [];
                for(var j = 0; j<numCellsV; j++) {
                        innerArr.push(0);
                }
                arr.push(innerArr);
        }
        return arr;
}

function display(arr) {
        for(var x = 0; x < arr.length; x++) {
                for(var y = 0; y < arr[x].length; y++) {
                        drawCell(x,y,arr[x][y]);
                }
        }
        back.style.background =
			'url(' + canvas.toDataURL() + ')';
}

function drawCell(x,y,alive) {
        context.beginPath();
        context.rect(x*pixelSize, y*pixelSize, pixelSize, pixelSize);
        context.fillStyle = alive ? 'lightgray' : '#FFF';
        context.fill();
}

function randomlyPopulate(arr) {
        for(var x = 0; x < arr.length; x++) {
                for(y = 0; y < arr[x].length; y++) {
                        if(Math.log(Math.random()*10) < -0.6) {
                                arr[x][y]=1;
                        }
                }
        }
}

function manualSetup(arr) {
		centerX = numCellsH / 2;
		centerY = numCellsV / 2;
        arr[centerX][centerY] = 1;
        arr[centerX][centerY + 1] = 1;
        arr[centerX][centerY - 1] = 1;
        arr[centerX - 1][centerY] = 1;
        arr[centerX + 1][centerY - 1] = 1;
}

function aliveNeighbors(arr, x, y) {
        if(x > 0 && y > 0 && x < numCellsH-1 && y < numCellsV-1) {
                var totalAlive = 
                        arr[x-1][y-1]+
                        arr[x][y-1]+
                        arr[x+1][y-1]+
                        arr[x-1][y]+
                        //arr[x][y]+
                        arr[x+1][y]+
                        arr[x-1][y+1]+
                        arr[x][y+1]+
                        arr[x+1][y+1];
                return totalAlive;
        } else {
                return 0;
        }
}

function step(arr) {
        var newArr = buildArr();
        for(var x = 0; x < arr.length; x++) {
                for(var y = 0; y < arr[x].length; y++) {
                        var cell = arr[x][y];
                        var alives = aliveNeighbors(arr, x,y);

                        if(cell == 1) {
                                if(alives < 2) {
                                        newArr[x][y] = 0;
                                } else if(alives == 2 || alives == 3) {
                                        newArr[x][y] = 1;
                                } else if(alives > 3) {
                                        newArr[x][y] = 0;
                                }
                        } else if(cell == 0 && alives == 3) {
                                newArr[x][y] = 1;
                        }
                }
        }
        return newArr;
}

//randomlyPopulate(arr);
manualSetup(arr);
display(arr);

setInterval(function() {
                var newArr = step(arr);
                display(newArr);
                arr = newArr;
}, 700);