window.onload = function(){

  var canvas = document.getElementById("canvas"),
  context = canvas.getContext("2d"),
  width = canvas.width = window.innerWidth,
  height = canvas.height = window.innerHeight;

  update();

  context.translate(width/2, height/2);

  function update(){
    context.clearRect(-width/2, -height/2, width, height);

    context.fillRect(-width/2, -height/2, width, height);

    requestAnimationFrame(update);
  }

};
