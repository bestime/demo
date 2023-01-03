declare namespace AnimateGfsWind {
  
  type GfsDataItem = {
    data: number[]
    header: {
      dx: number
      dy: number
      la1: number
      la2: number
      lo1: number
      lo2: number
      nx: number
      ny: number
      winds?: 'true' | 'false'
    };
    meta: {
      date: string
    };
  };

  interface Config {
    colors: string[] | ((value: number) => string)
    lineWidth: number,
    /** 绘制速度，单位：毫秒。默认：30。 */
    speed: number,
    reDraw?: () => void
  }
}