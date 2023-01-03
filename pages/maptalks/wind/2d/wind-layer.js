// 2
var WindLayer = (function () {
  function transformExtent(extent, opt_stops) {
    return applyTransform(extent, transform, undefined, opt_stops);
  }
  
  
  function transform(input, opt_output, opt_dimension) {
    const length = input.length;
    const dimension = opt_dimension > 1 ? opt_dimension : 2;
    let output = opt_output;
    if (output === undefined) {
      if (dimension > 2) {
        // preserve values beyond second dimension
        output = input.slice();
      } else {
        output = new Array(length);
      }
    }
    for (let i = 0; i < length; i += dimension) {
      output[i] = (180 * input[i]) / 20037508.342789244;
      output[i + 1] =
        (360 * Math.atan(Math.exp(input[i + 1] / 6378137))) / Math.PI - 90;
    }
    return output;
  }
  
  
  function applyTransform(extent, transformFn, opt_extent, opt_stops) {
    let coordinates = [];
    if (opt_stops > 1) {
      const width = extent[2] - extent[0];
      const height = extent[3] - extent[1];
      for (let i = 0; i < opt_stops; ++i) {
        coordinates.push(
          extent[0] + (width * i) / opt_stops,
          extent[1],
          extent[2],
          extent[1] + (height * i) / opt_stops,
          extent[2] - (width * i) / opt_stops,
          extent[3],
          extent[0],
          extent[3] - (height * i) / opt_stops
        );
      }
    } else {
      coordinates = [
        extent[0],
        extent[1],
        extent[2],
        extent[1],
        extent[2],
        extent[3],
        extent[0],
        extent[3],
      ];
    }
    transformFn(coordinates, coordinates, 2);
    const xs = [];
    const ys = [];
    for (let i = 0, l = coordinates.length; i < l; i += 2) {
      xs.push(coordinates[i]);
      ys.push(coordinates[i + 1]);
    }
    return boundingExtentXYs(xs, ys, opt_extent);
  }
  
  function boundingExtentXYs(xs, ys, opt_extent) {
    const minX = Math.min.apply(null, xs);
    const minY = Math.min.apply(null, ys);
    const maxX = Math.max.apply(null, xs);
    const maxY = Math.max.apply(null, ys);
    return createOrUpdate(minX, minY, maxX, maxY, opt_extent);
  }
  
  function createOrUpdate(minX, minY, maxX, maxY, opt_extent) {
    if (opt_extent) {
      opt_extent[0] = minX;
      opt_extent[1] = minY;
      opt_extent[2] = maxX;
      opt_extent[3] = maxY;
      return opt_extent;
    } else {
      return [minX, minY, maxX, maxY];
    }
  }
  
  class Main extends maptalks.Layer {
    _data = []
    _windOption = {}
  
    // 构造函数
    constructor(id, options) {
      super(id, options);  
      
      this._windOption = options.windOption || {}
    }
  
    setData(data) {
      this.data = data;
      return this;
    }


    getWindConfig () {
      return this._windOption
    }
  
  
    getData() {
      return this.data;
    }
  }
  
  
  
  class HelloLayerRenderer extends maptalks.renderer.CanvasRenderer {
    _IWind = undefined;
    checkResources() {
      //HelloLayer只是绘制文字, 没有外部图片, 所以返回空数组
      return [];
    }
  
    _getWindExtents () {
      var map = this.getMap();
      var extent = JSON.parse(JSON.stringify(map.getExtent()));
  
      const projExtent = map.getProjExtent();
      const list = [projExtent.xmin, projExtent.ymin, projExtent.xmax, projExtent.ymax];
      const mapExtent = transformExtent(list, 0);
      extent = {
        xmin: mapExtent[0],
        ymin: mapExtent[1],
        xmax: mapExtent[2],
        ymax: mapExtent[3],
      }
      
      // extent = [[projExtent.xmin, projExtent.ymin], [projExtent.xmax, projExtent.ymax]] ;
  
  

  
  
      
      return [
        [[0, 0], [map.width, map.height]],
        map.width, map.height,
        [[extent.xmin, extent.ymin], [extent.xmax, extent.ymax]]
      ];
    }
  
  
  
    draw() {
      if(!this.canvas) {
        this.prepareCanvas();
        const windConfig = this.layer.getWindConfig()
        Object.assign(windConfig, {
          reDraw: () => {
            this.setCanvasUpdated()
          },
        })
        
        this._IWind = new AnimateGfsWind(this.canvas,windConfig )
      }
  
      this._IWind.setGfsData(this.layer.getData())
      const ext = this._getWindExtents()
      this._IWind.start(ext[0], ext[1], ext[2], ext[3])
  
      //结束绘制:
      // 1. 触发必要的事件
      // 2. 将渲染器的canvas设为更新状态, map会加载canvas并呈现在地图上
      this.completeRender();
    }  
  }
  
  Main.registerRenderer('canvas', HelloLayerRenderer);

  return Main
})();