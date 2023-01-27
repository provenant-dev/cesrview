import utils from './utils';
import parser from './parser';
import htmlGenerator from './generateHTML';
import codeTable from './codetable';


function parseCESRFromJSON(obj) {
  var data = {}

  for (let i in obj){
    if(typeof obj[i] === "object") {
      data[i] = parseCESRFromJSON(obj[i]);
    } else {
      data[i] = parser.parseCESR(obj[i]);
    }
  }
  return data
}


function extractJSON(stream) {
  try{
    var data = utils.matchRecursiveRegExp(stream,"\\{", "\\}");
    var json_data = JSON.parse(data.data);
    var rest = stream.slice(data.range[1]+1);
    return [rest, json_data];
  } catch (err) {
    console.log("Error on extracting JSON", err);
    return [stream, {}];
  }
}


function extractAttachment(stream) {
  var i = 0
  while(stream[i]!='{' && stream.length>i)
    i++;
  var rest = stream.slice(i);
  var attachment = stream.slice(0,i);
  return [rest, attachment];
}

var PARSED_DATA = []

function parseStream(stream) {
  let json_data, attachment;
  while(stream.length!=0) {
    if(stream[0]=='{') {
      
      [stream, json_data] = extractJSON(stream);
      let res = parseCESRFromJSON(json_data);
      if(res)
        PARSED_DATA.push(res);
    } else {
      [stream, attachment] = extractAttachment(stream);
      let res = parser.parseCESR(attachment);
      if(res)
        PARSED_DATA.push(res);
    }
  }
  console.log(PARSED_DATA);
  return PARSED_DATA;
}


export default defineNuxtPlugin(nuxtApp => {  
  return {
    provide: {
      parseStream: parseStream,
      PARSED_DATA: PARSED_DATA,
      generateCESRHtml: htmlGenerator.generateCESRHtml,
      getMetaInfoFromCESRCodetable: codeTable.getMetaInfo
    }
  }
})
// this.$parseStream()