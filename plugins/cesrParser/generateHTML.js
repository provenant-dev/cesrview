var stack = [];

function addTabSpace(multiplier=2) {
  return "&nbsp;".repeat(stack.length * multiplier);
}

function addCSSClass(value,meta){
  return "<span class='code_" + meta.code + "' meta-cesr-code='"+meta.code+"'>" + value + "</span>";
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
      // class need to add here
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