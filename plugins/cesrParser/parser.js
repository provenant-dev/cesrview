"use strict";

import codetable from './codetable';
import B64 from './converter';

/*
CESR Data only contains A to Z, a to z, 0 to 9, -, and _ to encode 6 bits of information.
Source: https://weboftrust.github.io/ietf-cesr/draft-ssmith-cesr.html#name-concrete-domain-representat
*/
function verifyCESRData(data){
  if(data.match(/[^A-Za-z0-9-_]/gm)==null)
    return true;
  return false;
}


function extractPrimitive(str, meta) {
  var rest = str.slice(meta.total_len);
  var parsed = {};
  if(str.length >= meta.total_len) {
    parsed = {
      ____value: str.slice(0, meta.total_len),
      ____meta: meta
    }
  }
  return [rest, parsed];
}


function extractCountCode(str, meta) {
  var counter_code = str.slice(meta.code_len-meta.count_code_len, meta.code_len)
  var rest = str.slice(meta.code_len);
  var parsed = {};
  
  if(counter_code) {
    parsed = {
      ____value: str.slice(0, meta.code_len),
      ____meta: {
        ...meta,
        counter_code: counter_code,
        counter_code_int: B64.b64ToInt(counter_code)
      }
    }
  }
  return [rest, parsed]
}


function parseCESR(stream) {
  var parsed_data = [], return_data = {}, buffer = "";

  while(stream.length>0){
    let res = codetable.searchInCodetable(stream);
    if (!res) {
      buffer += stream.slice(0,1);
      stream = stream.slice(1);
      continue;
    }
    if(res.hasOwnProperty("type") && res.type == "count") {
      [stream, return_data] = extractCountCode(stream, res);
    } else {
      [stream, return_data] = extractPrimitive(stream, res);
    }
    if(buffer) {
      parsed_data.push({
        ____value: buffer
      });
      buffer = "";
    }
    if(return_data) {
      parsed_data.push(return_data);
      return_data = {};
    }
  }
  if(buffer) {
    parsed_data.push({
      ____value: buffer
    });
    buffer = "";
  }

  return parsed_data;
}


export default {parseCESR};