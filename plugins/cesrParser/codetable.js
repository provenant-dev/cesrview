"use strict";

const CODE_TABLE = {
  "A": {
    "name": "Ed25519Seed",
    "code_len": 1,
    "total_len": 44
  },
  "B": {
    "name": "Ed25519NT",
    "code_len": 1,
    "total_len": 44
  },
  "C": {
    "name": "X25519",
    "code_len": 1,
    "total_len": 44
  },
  "D": {
    "name": "Ed25519",
    "code_len": 1,
    "total_len": 44
  },
  "E": {
    "name": "Blake3_256",
    "code_len": 1,
    "total_len": 44
  },
  "F": {
    "name": "Blake2B256",
    "code_len": 1,
    "total_len": 44
  },
  "G": {
    "name": "Blake2S256",
    "code_len": 1,
    "total_len": 44
  },
  "H": {
    "name": "SHA3_256",
    "code_len": 1,
    "total_len": 44
  },
  "I": {
    "name": "SHA2_256",
    "code_len": 1,
    "total_len": 44
  },
  "J": {
    "name": "RandomSeed256ECDSAsecp256k1",
    "code_len": 1,
    "total_len": 44
  },
  "K": {
    "name": "RandomSeed448",
    "code_len": 1,
    "total_len": 76
  },
  "L": {
    "name": "X448",
    "code_len": 1,
    "total_len": 76
  },
  "O": {
    "name": "X25519Private",
    "code_len": 1,
    "total_len": 44
  },
  "P": {
    "name": "X25519CipherSeed",
    "code_len": 1,
    "total_len": 124
  },
  "0": {
    "A": {
      "name": "RandomSeed128",
      "code_len": 2,
      "total_len": 24
    },
    "B": {
      "name": "Ed25519Sha512",
      "code_len": 2,
      "total_len": 88
    },
    "C": {
      "name": "ECDSAsecp256k1Sha256",
      "code_len": 2,
      "total_len": 88
    },
    "D": {
      "name": "Blake3_512",
      "code_len": 2,
      "total_len": 88
    },
    "E": {
      "name": "SHA3_512",
      "code_len": 2,
      "total_len": 88
    },
    "F": {
      "name": "Blake2B512",
      "code_len": 2,
      "total_len": 88
    },
    "G": {
      "name": "SHA2_512",
      "code_len": 2,
      "total_len": 88
    }
  },
  "1": {
    "A": {
      "A": {
        "A": {
          "name": "ECDSAsecp256k1NT",
          "code_len": 4,
          "total_len": 51
        },
        "B": {
          "name": "ECDSAsecp256k1",
          "code_len": 4,
          "total_len": 51
        },
        "C": {
          "name": "Ed448NT",
          "code_len": 4,
          "total_len": 80
        },
        "D": {
          "name": "Ed448",
          "code_len": 4,
          "total_len": 80
        },
        "E": {
          "name": "Ed448",
          "code_len": 4,
          "total_len": 156
        },
        "H": {
          "name": "X25519CipherSalt",
          "code_len": 4,
          "total_len": 4
        }
      }
    }
  },
  "-": {
    "A": {
      "name": "...",
      "count_code_len": 2,
      "code_len": 4,
      "total_len": 4,
      "type": "count"
    },
    "C": {
      "name": "NontransferableReceiptCouples",
      "count_code_len": 2,
      "code_len": 4,
      "total_len": 4,
      "type": "count"
    },
    "V": {
      "name": "Frame",
      "count_code_len": 2,
      "code_len": 4,
      "total_len": 4,
      "type": "count"
    }
  }
}


function searchInCodetable(str) {
  if(str.length<1) return false;
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


export default {searchInCodetable};