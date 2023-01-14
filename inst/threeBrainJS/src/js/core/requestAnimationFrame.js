
const requestAnimationFrame = window.requestAnimationFrame ||
  window.mozRequestAnimationFrame ||
  window.webkitRequestAnimationFrame ||
  window.msRequestAnimationFrame ||
  window.oRequestAnimationFrame ||
  function (callback) {
      setTimeout(function() { callback(Date.now()); },  1000/60);
  };


export { requestAnimationFrame };
