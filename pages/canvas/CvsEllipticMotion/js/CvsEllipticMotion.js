/**
 * 注意：建议引入静态文件，不建议通过import载入
 *
 * @see [小球转圈圈](https://github.com/bestime/demo/tree/main/pages/canvas/CvsEllipticMotion)
 * @author bestime
 */
var CvsEllipticMotion = (function () {
  
  function getCoordinate (centerX, centerY, radiusX, radiusY, angle) {
    var nowAngle = (Math.PI/180) * angle;
    const x = centerX + radiusX * Math.sin(nowAngle);
    const y = centerY - radiusY * Math.cos(nowAngle);
  
    return [x, y]
  }


  function Main (oWarperElement) {
    this.config = {
      isMoving: false
    }
    oWarperElement.setAttribute('plugin', 'CvsEllipticMotion')
    var oCanvasElement = document.createElement('canvas')
    var oBg = document.createElement('div')
    oBg.className = 'vemcbg01'
    this._canvasEl = oCanvasElement
    this._canvasContext = oCanvasElement.getContext("2d");
    this._wrapper = oWarperElement

    this.resize(true)

    
    const color = 'rgba(30,168,234,0.2)'
    

    this._tracks = [
      this._createTrack(1, 0, -0.3, 8, color),
      this._createTrack(1, 180, 0.1, 6, color),

      this._createTrack(0.9, 45, 0.2, 14, color),
      this._createTrack(0.9, 225, 0.1, 8, color),
      
      this._createTrack(0.8, 90, 0.3, 6, color),
      this._createTrack(0.8, 270, 0.1, 8, color),

      this._createTrack(0.7, 135, 0.1, 6, color),
      this._createTrack(0.7, 315, 0.15, 8, color),

      this._createTrack(0.6, 180, 0.25, 8, color),
      this._createTrack(0.6, 0, -0.15, 12, color),

      // this._createTrack(0.5, 225, 0.1, 8, color),
      // this._createTrack(0.5, 45, -0.1, 8, color),

      // this._createTrack(0.4, 270, 0.1, 8, color),
      // this._createTrack(0.4, 90, -0.1, 8, color),

      // this._createTrack(0.3, 315, 0.1, 8, color),
      // this._createTrack(0.3, 135, -0.1, 8, color),
    ]




    oWarperElement.appendChild(oCanvasElement)
    oWarperElement.appendChild(oBg)
    

  

    this.start()

  }


  Main.prototype.redraw = function () {
    if(!this.config || !this.config.isMoving) return;
    var ctx = this._canvasContext

    ctx.clearRect(0,0,this.config.penWidth, this.config.penHeight)
    // this.drawGradientBackground()

    
    
    this._tracks.forEach(item => {
      this.drawTrack(item)
    })
    


    window.requestAnimationFrame(() => {
      this.redraw()
    })
  }

  Main.prototype.drawTrack = function (item) {
    var ctx = this._canvasContext
    ctx.lineWidth = 1;
    ctx.strokeStyle=item.trackColor
    ctx.beginPath()

    var x = this.config.center[0]
    var y = this.config.center[1]
    var rx = x * item.scale
    var ry = y * item.scale

    

    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI*2);
    ctx.stroke();
    ctx.closePath();
    


    // 绘制运动体
    var dotCenter = getCoordinate(x, y, rx, ry, item.angle)
    
    
    item.angle = (item.angle + item.speed) % 360
    
    ctx.beginPath()
    ctx.fillStyle = item.dotColor
    ctx.arc(dotCenter[0], dotCenter[1], item.dotSize, 0, 2 * Math.PI);
    ctx.fill()
    ctx.closePath();

    
  }

  /**
   * 创建一个轨道
   * @param scale - 缩放比例
   * @param angel - 初始角度
   * @param speed - 重绘速度（-360~360）
   * @returns 轨道数据
   */
  Main.prototype._createTrack = function (scale, angle, speed, dotSize, color) {
    return {
      scale,
      angle: angle,
      speed: speed,
      trackColor: 'rgba(255,255,255,0.05)',
      dotColor: color,
      dotSize: dotSize
    }
  }

  // 绘制渐变背景色
  Main.prototype.drawGradientBackground = function () {
    
    var ctx = this._canvasContext
    var centerX = this.config.center[0]
    var centerY = this.config.center[1]
    var maxRadius = Math.max(this.config.radius[0], this.config.radius[1])

    var grd = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, maxRadius);
    grd.addColorStop(0, "#3d7373");
    grd.addColorStop(1, "#021417");

    ctx.fillStyle = grd;
    ctx.fillRect(0,0, this.config.penWidth, this.config.penHeight);
  }

  // 开始
  Main.prototype.start = function () {
    this.config.isMoving = true
    this.redraw()
  }

  // 暂停
  Main.prototype.pause = function () {
    clearTimeout(this._timer)
    this.config.isMoving = false
  }

  Main.prototype.resize = function (rightAway) {
    
    

    const commit = () => {
      var cssWidth = this._wrapper.offsetWidth
      var cssHeight = this._wrapper.offsetHeight
      var penWidth = cssWidth
      var penHeight = cssHeight
      var center = [Math.ceil(penWidth / 2), Math.ceil(penHeight / 2)]
  
      this._canvasEl.width = penWidth
      this._canvasEl.height = penHeight
      this._canvasEl.style.width = '100%'
      this._canvasEl.style.height = '100%'
      
  
      Object.assign(this.config, {
        cssWidth: this._wrapper.offsetWidth,
        cssHeight: this._wrapper.offsetHeight,
        penWidth: this._wrapper.offsetWidth,
        penHeight: this._wrapper.offsetHeight,
        center,
        radius: center
      })
    }

    clearTimeout(this._timer02)

    if(rightAway) {
      commit()
      return;
    }
    this._timer02 = setTimeout(commit, 100);
    
  }

  // 判断是否运动中
  Main.prototype.isMoving = function () {
     return this.config.isMoving
  }

  // 销毁
  Main.prototype.dispose = function () {
    this.pause()
    clearTimeout(this._timer02)
    this.config = undefined
  }

  return Main
})();