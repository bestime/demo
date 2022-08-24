const TileLayer = window.maptalks.TileLayer
const VectorLayer = window.maptalks.VectorLayer
const Polygon = window.maptalks.Polygon

/**
 * 不知道为什么在顶部结构 window.maptalks 会导致报错
 * 工程项目可以直接通过npm import
 */
class YouYangMaptalksMaskPlugin {
  iMap = undefined;
  httpRequest = undefined
  layers = []

  constructor(map) {
    this.iMap = map      
  }

  render (boundary) {
    this.dispose()
    const map = this.iMap
    var maskPolygon = new Polygon(boundary);
        
    // 边框多边形
    const borderPolygon = maskPolygon.copy()
    borderPolygon.setSymbol({
      'lineColor' : '#55baa2',
      'lineWidth' : 2,
      polygonFillOpacity : 0
    })

    // 投影多边形（位移实现）
    const offsetPolygon = maskPolygon.copy()
    offsetPolygon.setSymbol([
      {
        lineWidth: 0,
        polygonFill: '#105541',
        polygonOpacity: 1
      }
    ])
    offsetPolygon.translate(0.01,-0.02)

    // 投影最底层多边形（位移实现）
    const offsetBlackPolygon = maskPolygon.copy()
    offsetBlackPolygon.setSymbol([
      {
        lineWidth: 0,
        polygonFill: '#1e3832',
        polygonOpacity: 1
      }
    ])
    offsetBlackPolygon.translate(0.04,-0.05)

    // 发光多边形
    const blurPolygon = maskPolygon.copy()
    blurPolygon.setSymbol([
      {
        lineWidth: 0,
        polygonFill: 'rgba(111,214,229,0.9)',
        polygonOpacity: 1
      }
    ])
    blurPolygon.translate(0.012,-0.022)

    //////////////// 【创建图层】  //////////////////////////////////

    // 发光图层
    var blurLayer = new VectorLayer("blurLayer", {
      cssFilter : 'blur(6px)'
    }).addGeometry([
      blurPolygon
    ]);

    
    // 投影图层
    var shadowLayer = new VectorLayer("shadowLayer", {
      cssFilter : 'blur(1px)'
    }).addGeometry([offsetPolygon]);
    var shadowLayer02 = new VectorLayer("shadowLayer02").addGeometry([offsetBlackPolygon]);
    

    // 边框图层
    var borderLayer = new VectorLayer("borderLayer").addGeometry([borderPolygon]);        

    // 瓦片蒙版图层
    var maskedLayer = new TileLayer("masked", {
      // urlTemplate: "./1.png",
      urlTemplate: "http://t{s}.tianditu.gov.cn/img_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=img&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=d89f15365eb3645f72f26c32f3afb3e8",
      subdomains: [1, 2, 3, 4],          
    })
    maskedLayer.setMask(maskPolygon) // set boundary as the mask to the tilelayer

    // 将所有图层按指定顺序绘制在地图上
    this.layers = [shadowLayer02, blurLayer, shadowLayer, maskedLayer, borderLayer] 
    map.addLayer(this.layers)
    return this;
  }

  dispose() {
    for(let a = 0; a < this.layers.length; a++) {
      this.layers[a].clear().remove()
      this.layers.splice(a--, 1)
    }
  }
}



