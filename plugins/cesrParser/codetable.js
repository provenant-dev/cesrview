"use strict";

const CODE_TABLE = {
  "A": {
    "name": "Ed25519_Seed",
    "code": "A",
    "code_len": 1,
    "total_len": 44,
    "description": "Ed25519 256 bit random seed for private key."
  },
  "B": {
    "name": "Ed25519N",
    "code": "B",
    "code_len": 1,
    "total_len": 44,
    "description": "Ed25519 verification key non-transferable, basic derivation."
  },
  "C": {
    "name": "X25519",
    "code": "C",
    "code_len": 1,
    "total_len": 44,
    "description": "X25519 public encryption key, converted from Ed25519 or Ed25519N."
  },
  "D": {
    "name": "Ed25519",
    "code": "D",
    "code_len": 1,
    "total_len": 44,
    "description": "Ed25519 verification key basic derivation."
  },
  "E": {
    "name": "Blake3_256",
    "code": "E",
    "code_len": 1,
    "total_len": 44,
    "description": "Blake3 256 bit digest self-addressing derivation."
  },
  "F": {
    "name": "Blake2b_256",
    "code": "F",
    "code_len": 1,
    "total_len": 44,
    "description": "Blake2b 256 bit digest self-addressing derivation."
  },
  "G": {
    "name": "Blake2s_256",
    "code": "G",
    "code_len": 1,
    "total_len": 44,
    "description": "Blake2s 256 bit digest self-addressing derivation."
  },
  "H": {
    "name": "SHA3_256",
    "code": "H",
    "code_len": 1,
    "total_len": 44,
    "description": "SHA3 256 bit digest self-addressing derivation."
  },
  "I": {
    "name": "SHA2_256",
    "code": "I",
    "code_len": 1,
    "total_len": 44,
    "description": "SHA2 256 bit digest self-addressing derivation."
  },
  "J": {
    "name": "ECDSA_256k1_Seed",
    "code": "J",
    "code_len": 1,
    "total_len": 44,
    "description": "ECDSA secp256k1 256 bit random Seed for private key."
  },
  "K": {
    "name": "Ed448_Seed",
    "code": "K",
    "code_len": 1,
    "total_len": 76,
    "description": "Ed448 448 bit random Seed for private key."
  },
  "L": {
    "name": "X448",
    "code": "L",
    "code_len": 1,
    "total_len": 76,
    "description": "X448 public encryption key, converted from Ed448."
  },
  "M": {
    "name": "Short",
    "code": "M",
    "code_len": 1,
    "total_len": 4,
    "description": "Short 2 byte b2 number."
  },
  "N": {
    "name": "Big",
    "code": "N",
    "code_len": 1,
    "total_len": 12,
    "description": "Big 8 byte b2 number."
  },
  "O": {
    "name": "X25519_Private",
    "code": "O",
    "code_len": 1,
    "total_len": 44,
    "description": "X25519 private decryption key converted from Ed25519."
  },
  "P": {
    "name": "X25519_Cipher_Seed",
    "code": "P",
    "code_len": 1,
    "total_len": 124,
    "description": "X25519 124 char b64 Cipher of 44 char qb64 Seed."
  },
  "0": {
    "A": {
      "name": "Salt_128",
      "code": "0A",
      "code_len": 2,
      "total_len": 24,
      "description": "Random salt, seed, private key, or sequence number of length 128 bits."
    },
    "B": {
      "name": "Ed25519_Sig",
      "code": "0B",
      "code_len": 2,
      "total_len": 88,
      "description": "Ed25519 signature"
    },
    "C": {
      "name": "ECDSA_256k1_Sig",
      "code": "0C",
      "code_len": 2,
      "total_len": 88,
      "description": "ECDSA secp256k1 signature"
    },
    "D": {
      "name": "Blake3_512",
      "code": "0D",
      "code_len": 2,
      "total_len": 88,
      "description": "Blake3 512 bit digest self-addressing derivation."
    },
    "E": {
      "name": "Blake2b_512",
      "code": "0E",
      "code_len": 2,
      "total_len": 88,
      "description": "Blake2b 512 bit digest self-addressing derivation."
    },
    "F": {
      "name": "SHA3_512",
      "code": "0F",
      "code_len": 2,
      "total_len": 88,
      "description": "SHA3 512 bit digest self-addressing derivation."
    },
    "G": {
      "name": "SHA2_512",
      "code": "0G",
      "code_len": 2,
      "total_len": 88,
      "description": "SHA2 512 bit digest self-addressing derivation."
    },
    "H": {
      "name": "Long",
      "code": "0H",
      "code_len": 2,
      "total_len": 8,
      "description": "Long 4 byte b2 number"
    }
  },
  "1": {
    "A": {
      "A": {
        "A": {
          "name": "ECDSA_256k1N",
          "code": "1AAA",
          "code_len": 4,
          "total_len": 48,
          "description": "ECDSA secp256k1 non-transferable prefix public verification key."
        },
        "B": {
          "name": "ECDSA_256k1",
          "code": "1AAB",
          "code_len": 4,
          "total_len": 48,
          "description": "Ed25519 public verification or encryption key, basic derivation."
        },
        "C": {
          "name": "Ed448N",
          "code": "1AAC",
          "code_len": 4,
          "total_len": 80,
          "description": "Ed448 non-transferable prefix public signing verification key. Basic derivation."
        },
        "D": {
          "name": "Ed448",
          "code": "1AAD",
          "code_len": 4,
          "total_len": 80,
          "description": "Ed448 public signing verification key. Basic derivation."
        },
        "E": {
          "name": "Ed448_Sig",
          "code": "1AAE",
          "code_len": 4,
          "total_len": 56,
          "description": "Ed448 signature. Self-signing derivation."
        },
        "F": {
          "name": "Tern",
          "code": "1AAF",
          "code_len": 4,
          "total_len": 8,
          "description": "3 byte b2 number or 4 char B64 str."
        },
        "G": {
          "name": "DateTimeB64",
          "code": "1AAG",
          "code_len": 4,
          "total_len": 36,
          "description": "DateTime Base64 custom encoded 32 char ISO-8601 DateTime."
        },
        "H": {
          "name": "X25519_Cipher_Salt",
          "code": "1AAH",
          "code_len": 4,
          "total_len": 100,
          "description": "X25519 100 char b64 Cipher of 24 char qb64 Salt."
        }
      }
    }
  },
  "2": {
    "A": {
      "A": {
        "A": {
          "name": "TBD1",
          "code": "2AAA",
          "code_len": 4,
          "total_len": 8,
          "description": "Testing purposes only fixed with lead size 1."
        }
      }
    }
  },
  "3": {
    "A": {
      "A": {
        "A": {
          "name": "TBD2",
          "code": "3AAA",
          "code_len": 4,
          "total_len": 8,
          "description": "Testing purposes only of fixed with lead size 2."
        }
      }
    }
  },
  "4": {
    "A": {
      "name": "StrB64_L0",
      "code": "4A",
      "code_len": 2,
      "total_len": 2,
      "description": "String Base64 Only Lead Size 0."
    },
    "B": {
      "name": "Bytes_L0",
      "code": "4B",
      "code_len": 2,
      "total_len": 2,
      "description": "Byte String Leader Size 0."
    }
  },
  "5": {
    "A": {
      "name": "StrB64_L1",
      "code": "5A",
      "code_len": 2,
      "total_len": 2,
      "description": "String Base64 Only Lead Size 1."
    },
    "B": {
      "name": "Bytes_L1",
      "code": "5B",
      "code_len": 2,
      "total_len": 2,
      "description": "Byte String Leader Size 1."
    }
  },
  "6": {
    "A": {
      "name": "StrB64_L2",
      "code": "6A",
      "code_len": 2,
      "total_len": 2,
      "description": "String Base64 Only Lead Size 2."
    },
    "B": {
      "name": "Bytes_L2",
      "code": "6B",
      "code_len": 2,
      "total_len": 2,
      "description": "Byte String Leader Size 2."
    }
  },
  "7": {
    "A": {
      "A": {
        "A": {
          "name": "StrB64_Big_L0",
          "code": "7AAA",
          "code_len": 4,
          "total_len": 4,
          "description": "String Base64 Only Big Lead Size 0."
        },
        "B": {
          "name": "Bytes_Big_L0",
          "code": "7AAB",
          "code_len": 4,
          "total_len": 4,
          "description": "Byte String Big Leader Size 0."
        }
      }
    }
  },
  "8": {
    "A": {
      "A": {
        "A": {
          "name": "StrB64_Big_L1",
          "code": "8AAA",
          "code_len": 4,
          "total_len": 4,
          "description": "String Base64 Only Big Lead Size 1."
        },
        "B": {
          "name": "Bytes_Big_L1",
          "code": "8AAB",
          "code_len": 4,
          "total_len": 4,
          "description": "Byte String Big Leader Size 1."
        }
      }
    }
  },
  "9": {
    "A": {
      "A": {
        "A": {
          "name": "StrB64_Big_L2",
          "code": "9AAA",
          "code_len": 4,
          "total_len": 4,
          "description": "String Base64 Only Big Lead Size 2."
        },
        "B": {
          "name": "Bytes_Big_L2",
          "code": "9AAB",
          "code_len": 4,
          "total_len": 4,
          "description": "Byte String Big Leader Size 2."
        }
      }
    }
  },
  "-": {
    "A": {
      "name": "ControllerIdxSigs",
      "count_code_len": 2,
      "code": "-A",
      "code_len": 4,
      "total_len": 4,
      "type": "count",
      "description": "Qualified Base64 Indexed Signature."
    },
    "B": {
      "name": "WitnessIdxSigs",
      "count_code_len": 2,
      "code": "-B",
      "code_len": 4,
      "total_len": 4,
      "type": "count",
      "description": "Qualified Base64 Indexed Signature."
    },
    "C": {
      "name": "NontransferableReceiptCouples",
      "count_code_len": 2,
      "code": "-C",
      "code_len": 4,
      "total_len": 4,
      "type": "count",
      "description": "Count of attached qualified Base64 nontransferable identifier receipt couples pre+sig."
    },
    "D": {
      "name": "TransReceiptQuadruples",
      "count_code_len": 2,
      "code": "-D",
      "code_len": 4,
      "total_len": 4,
      "type": "count",
      "description": "Composed Base64 Quadruple, pre+snu+dig+sig."
    },
    "E": {
      "name": "FirstSeenReplayCouples",
      "count_code_len": 2,
      "code": "-E",
      "code_len": 4,
      "total_len": 4,
      "type": "count",
      "description": "Composed Base64 Couple, fnu+dts."
    },
    "F": {
      "name": "TransIndexedSigGroups",
      "count_code_len": 2,
      "code": "-F",
      "code_len": 4,
      "total_len": 4,
      "type": "count",
      "description": "Composed Base64 Group, pre+snu+dig+ControllerIdxSigs group."
    },
    "G": {
      "name": "SealSourceCouples",
      "count_code_len": 2,
      "code": "-G",
      "code_len": 4,
      "total_len": 4,
      "type": "count",
      "description": "Composed Base64 couple, snu+dig of given delegators or issuers event."
    },
    "H": {
      "name": "TransLastIdxSigGroups",
      "count_code_len": 2,
      "code": "-H",
      "code_len": 4,
      "total_len": 4,
      "type": "count",
      "description": "Composed Base64 Group, pre+ControllerIdxSigs group."
    },
    "I": {
      "name": "SealSourceTriples",
      "count_code_len": 2,
      "code": "-I",
      "code_len": 4,
      "total_len": 4,
      "type": "count",
      "description": "Composed Base64 triple, pre+snu+dig of anchoring source event."
    },
    "J": {
      "name": "SadPathSig",
      "count_code_len": 2,
      "code": "-J",
      "code_len": 4,
      "total_len": 4,
      "type": "count",
      "description": "Composed Base64 Group path+TransIdxSigGroup of SAID of content."
    },
    "K": {
      "name": "SadPathSigGroup",
      "count_code_len": 2,
      "code": "-K",
      "code_len": 4,
      "total_len": 4,
      "type": "count",
      "description": "Composed Base64 Group, root(path)+SaidPathCouples."
    },
    "L": {
      "name": "PathedMaterialQuadlets",
      "count_code_len": 2,
      "code": "-L",
      "code_len": 4,
      "total_len": 4,
      "type": "count",
      "description": "Composed Grouped Pathed Material Quadlet (4 char each)."
    },
    "V": {
      "name": "AttachedMaterialQuadlets",
      "count_code_len": 2,
      "code": "-V",
      "code_len": 4,
      "total_len": 4,
      "type": "count",
      "description": "Composed Grouped Attached Material Quadlet (4 char each)."
    },
    "0": {
      "V": {
        "name": "BigAttachedMaterialQuadlets",
        "count_code_len": 3,
        "code": "-0V",
        "code_len": 8,
        "total_len": 8,
        "type": "count",
        "description": "Composed Grouped Attached Material Quadlet (4 char each)."
      }
    },
    "-": {
      "A": {
        "A": {
          "A": {
            "name": "KERIProtocolStack",
            "count_code_len": 5,
            "code": "--AAA",
            "code_len": 8,
            "total_len": 8,
            "type": "count",
            "description": "KERI ACDC Protocol Stack CESR Version."
          }
        }
      }
    }
  }
}


function searchInCodetable(str) {
  if(str && str.length<1) return false;
  var i = 0,
      code = CODE_TABLE[str[i]],
      prev_code =CODE_TABLE[str[i]];

  while(str.length>i && code){
    prev_code = code
    code = code[str[++i]];
  }

  if(prev_code && prev_code.hasOwnProperty('total_len') && str.length>=prev_code.total_len){
    return prev_code
  }
  return false;
}

function getMetaInfo(code) {
  if(code && code.length<1) return false;
  var i = 0,
      meta_info = CODE_TABLE[code[i]],
      prev_meta_info = CODE_TABLE[code[i]];

  while(code.length>i){
    if(!meta_info) {
      return false;
    }
    prev_meta_info = meta_info
    meta_info = meta_info[code[++i]];
  }

  if(prev_meta_info.hasOwnProperty('name')) {
    return prev_meta_info
  }
  return false;
}

export default {searchInCodetable, getMetaInfo};