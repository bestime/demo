




/**
 * 此插件以视觉左上角为圆点
 * 以右为0°，顺时针方向旋转
*/
var Wind = (function () {
  function deg2rad(deg) {
    return deg / 180 * Math.PI;
  };

  function mercY(lat) {
    return Math.log(Math.tan(lat / 2 + Math.PI / 4));
 };


 function getNextPoint (x, y, distance, angle) {
  const hd = angle*Math.PI/180
  return {
    x: Math.sin(hd) * distance + x,
    y: Math.cos(hd) * distance + y,
  }
 }

  // 经纬度转像素坐标
  function project(lat, lon, config) {
    // both in radians, use deg2rad if neccessary
    var ymin = mercY(config.south);
    var ymax = mercY(config.north);
    var xFactor = config.width / (config.east - config.west);
    var yFactor = config.height / (ymax - ymin);

    var y = mercY(deg2rad(lat));
    var x = (deg2rad(lon) - config.west) * xFactor;
    var y = (ymax - y) * yFactor; // y points south

    // console.log("坐标转换", lat, lon, config, x, y)
    return [x, y];
};

  function createPointList (list, config) {
    return list.map(function (item) {
      const point = project(item.y, item.x, config)
      return {
        x0: point[0],
        y0: point[1],
        x: point[0],
        y: point[1],
        angle: 90-item.angle,
        age: 100
      }
    })
  }
  
  
  function Plugin (canvas, _rerender) {
    console.log("画布", canvas)
    this._data = []
    this._rerender = _rerender
    this._particles = []
    this._config = null
    this._timer_01 = null
    this._canvas = canvas
    this._ctx = canvas.getContext('2d');
  }

  Plugin.prototype.setData = function (data) {
    this._data = data
  }

  Plugin.prototype.clear = function () {
    console.log("打个", this._config)
    if(this._config) {
      this._ctx.clearRect(0, 0, this._config.width, this._config.height);
    }
    
  }

  Plugin.prototype.pause = function () {
    clearTimeout(this._timer_01)
    this.clear()
    return this
  }

  Plugin.prototype.draw = function () {
    clearTimeout(this._timer_01)
    if(!this._config) return this.pause();
    
    // this._ctx.clearRect(0, 0, this._config.width, this._config.height);
    var prev = this._ctx.globalCompositeOperation;
    this._ctx.globalCompositeOperation = 'destination-in';
    
      this._ctx.fillRect(0, 0, this._config.width, this._config.height);
      this._ctx.globalCompositeOperation = prev;

    this._particles.forEach(point => {
      if(point.age<=0) return;
      this._ctx.fillStyle = 'rgba(255,255,255,0.9)';
      this._ctx.fillRect(point.x, point.y, 1, 1);
      const newPoint = getNextPoint(point.x, point.y, 1, point.angle)
      // console.log("钱", point.x, point.y)
      point.x = newPoint.x
      point.y = newPoint.y
      point.age--

      // console.log("point", point.x, point.y)
      

    })

    this._rerender()

    this._timer_01 = setTimeout(() => {
      this.draw()
    }, 30)
  }
  
  
  Plugin.prototype.start = function (config) {
    const setting = {
      width: config.width,
      height: config.height,
      south: deg2rad(config.south),
      north: deg2rad(config.north),
      east: deg2rad(config.east),
      west: deg2rad(config.west),
    }
    this._config = setting
    this._canvas.width = config.width
    this._config.height = config.height

    this._particles = createPointList(this._data, setting)
    this.draw()
    
    console.log("地图", setting, this._particles)
    
  }

  return Plugin
})();

