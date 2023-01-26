"use strict";

const matchRecursiveRegExp = (str, left, right, flags) => {
  var f = flags || "g",
    g = f.indexOf("g") > -1,
    x = new RegExp(left + "|" + right, f),
    l = new RegExp(left, f.replace(/g/g, "")),
    a = [],
    index_list = [],
    t, s, m;

  do {
    t = 0;
    while (m = x.exec(str)) {
      if (l.test(m[0])) {
        if (!t++) s = x.lastIndex;
      } else if (t) {
        if (!--t) {
          var parsed = str.slice(s-1, m.index+1) 
          return {
            data: parsed,
            range: [s, m.index]
          };
        }
      }
    }
  } while (t && (x.lastIndex = s));

  return {
    data: "",
    range: [0,0]
  };
}

export default {matchRecursiveRegExp};