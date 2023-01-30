var stack = [];
var lineNumber = 0;

function addTabSpace(multiplier=3) {  // multiplier = tab size
  return "&nbsp;".repeat(stack.length * multiplier);
}


function addCSSClass(value, meta){
  let meta_count_data = "";
  if(meta.hasOwnProperty('type')) {
    meta_count_data = " meta-cesr-count-code='" + meta.counter_code + "' meta-cesr-count-code-int='" + meta.counter_code_int + "' ";
  }
  return "<span class='code_" + meta.code + "' meta-cesr-code='"+meta.code+"' "+ meta_count_data +" >" + value + "</span>";
}


function generateLine(data) {
  lineNumber++;
  return "<div class='op-line-container'><div class='op-line-number'>"+ lineNumber +"</div><div class='op-line-data'>"+ data +"</div></div>";
}

function __generateCESRHtml(object) {
  var generated = "";
  for (let i in object) {
    if(isNaN(Number(i))){
      let temp = addTabSpace() + i + ": "

      if(object[i] && object[i].hasOwnProperty('length') && object[i].length > 1) {
        temp += "[ ";
      } else {
        temp += "{ ";
      }
      generated += generateLine(temp);
      stack.push(i);
    }

    if(object[i].hasOwnProperty('____meta')) {
      generated += generateLine(addTabSpace() + addCSSClass(object[i].____value, object[i].____meta) + ",");
    } else if (object[i].hasOwnProperty('____value')){
      generated += generateLine(addTabSpace() + object[i].____value + ",");
    } else {
      generated += __generateCESRHtml(object[i])
    }

    if(isNaN(Number(i))){
      stack.pop();
      if(object[i] && object[i].hasOwnProperty('length') && object[i].length > 1) {
        generated += generateLine(addTabSpace() + "]");
      } else {
        generated += generateLine(addTabSpace() + "}");
      }
    }
  }
  return generated
}


function generateCESRHtml(object) {
  lineNumber = 0;
  return __generateCESRHtml(object);
}

export default {generateCESRHtml}