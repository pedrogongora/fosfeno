/* 
    See: http://www.timotheegroleau.com/Flash/experiments/easing_function_generator.htm

    Parameters for all functions:
        t: number  ->  time elapsed, beggining in 0
        b: number  ->  start value
        c: number  ->  total change in value (ie., final value - start value)
        d: number  ->  total duration
 */
export class EasingFunction {
  static functions = {
    linear: (t: number, b: number, c: number, d: number) => {
      t /= d
      return b + c * t
    },

    'in-out-cubic': (t: number, b: number, c: number, d: number) => {
      let ts = (t /= d) * t
      let tc = ts * t
      return b + c * (-2 * tc + 3 * ts)
    },

    'in-cubic': (t: number, b: number, c: number, d: number) => {
      let tc: number = (t /= d) * t * t
      return b + c * tc
    },

    'out-cubic': (t: number, b: number, c: number, d: number) => {
      let ts: number = (t /= d) * t
      let tc: number = ts * t
      return b + c * (tc + -3 * ts + 3 * t)
    },

    'in-elastic': (t: number, b: number, c: number, d: number) => {
      let ts: number = (t /= d) * t
      let tc: number = ts * t
      return b + c * (33 * tc * ts + -59 * ts * ts + 32 * tc + -5 * ts)
    },

    'out-elastic': (t: number, b: number, c: number, d: number) => {
      let ts: number = (t /= d) * t
      let tc: number = ts * t
      return (
        b + c * (33 * tc * ts + -106 * ts * ts + 126 * tc + -67 * ts + 15 * t)
      )
    },

    'out-in-quartic': (t: number, b: number, c: number, d: number) => {
      let ts = (t /= d) * t
      let tc = ts * t
      return b + c * (6 * tc + -9 * ts + 4 * t)
    },
  }
}
