var stack = [];

function addTabSpace(multiplier=3) {  // multiplier = tab size
  return "&nbsp;".repeat(stack.length * multiplier);
}

var lineNumber = 0;
function addNewLine() {
  lineNumber++;
  if(lineNumber === 1)
    return "<span class='op-line-number'>" + lineNumber + "</span>";
  return "<br><span class='op-line-number'>" + lineNumber + "</span>";
}

function addCSSClass(value,meta){
  let meta_count_data = "";
  if(meta.hasOwnProperty('type')) {
    meta_count_data = " meta-cesr-count-code='" + meta.counter_code + "' meta-cesr-count-code-int='" + meta.counter_code_int + "' ";
  }
  return "<span class='code_" + meta.code + "' meta-cesr-code='"+meta.code+"' "+ meta_count_data +" >" + value + "</span>";
}

function __generateCESRHtml(object) {
  var generated = "";
  for (let i in object) {
    if(isNaN(Number(i))){
      generated = generated + addNewLine() + addTabSpace() + i + ": "

      if(object[i] && object[i].hasOwnProperty('length') && object[i].length > 1) {
        generated = generated + "[ ";
      } else {
        generated = generated + "{ ";
      }
      stack.push(i);
    }

    if(object[i].hasOwnProperty('____meta')) {
      generated = generated + addNewLine() + addTabSpace() + addCSSClass(object[i].____value, object[i].____meta) + ",";
    } else if (object[i].hasOwnProperty('____value')){
      generated = generated + addNewLine() + addTabSpace() + object[i].____value + ",";
    } else {
      generated += __generateCESRHtml(object[i])
    }

    if(isNaN(Number(i))){
      stack.pop();
      if(object[i] && object[i].hasOwnProperty('length') && object[i].length > 1) {
        generated = generated + addNewLine() + addTabSpace() + "]";
      } else {
        generated = generated + addNewLine() + addTabSpace() + "}";
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