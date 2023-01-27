var stack = [];

function addTabSpace(multiplier=2) {  // multiplier = tab size
  return "&nbsp;".repeat(stack.length * multiplier);
}

function addCSSClass(value,meta){
  let meta_count_data = "";
  if(meta.hasOwnProperty('type')) {
    meta_count_data = " meta-cesr-count-code='" + meta.counter_code + "' meta-cesr-count-code-int='" + meta.counter_code_int + "' ";
  }
  return "<span class='code_" + meta.code + "' meta-cesr-code='"+meta.code+"' "+ meta_count_data +" >" + value + "</span>";
}

function generateCESRHtml(object) {
  var generated = "";
  for (let i in object) {
    if(isNaN(Number(i))){
      generated = generated + addTabSpace() + i + ": "

      if(object[i] && object[i].hasOwnProperty('length') && object[i].length > 1) {
        generated += "[ <br>"
      } else {
        generated += "{ <br>"
      }
      stack.push(i);
    }

    if(object[i].hasOwnProperty('____meta')) {
      generated = generated + addTabSpace() + addCSSClass(object[i].____value, object[i].____meta) + ",<br>";
    } else if (object[i].hasOwnProperty('____value')){
      generated = generated + addTabSpace() + object[i].____value + ",<br>";
    } else {
      generated += generateCESRHtml(object[i])
    }

    if(isNaN(Number(i))){
      stack.pop();
      if(object[i] && object[i].hasOwnProperty('length') && object[i].length > 1) {
        generated = generated + addTabSpace() + "]<br>"
      } else {
        generated = generated + addTabSpace() + "}<br>"
      }
      
    }
  }
  return generated
}


export default {generateCESRHtml}