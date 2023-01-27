"use strict";

const CODE_TABLE = {
  "A": {
    "name": "Ed25519Seed",
    "code": "A",
    "code_len": 1,
    "total_len": 44,
    "description": "Seed of Ed25519 private key"
  },
  "B": {
    "name": "Ed25519NT",
    "code": "B",
    "code_len": 1,
    "total_len": 44,
    "description": "Ed25519 non-transferable prefix public verification key"
  },
  "C": {
    "name": "X25519",
    "code": "C",
    "code_len": 1,
    "total_len": 44,
    "description": "X25519 public encryption key."
  },
  "D": {
    "name": "Ed25519",
    "code": "D",
    "code_len": 1,
    "total_len": 44,
    "description": "Ed25519 public verification key"
  },
  "E": {
    "name": "Blake3_256",
    "code": "E",
    "code_len": 1,
    "total_len": 44,
    "description": "Blake3-256 Digest"
  },
  "F": {
    "name": "Blake2B256",
    "code": "F",
    "code_len": 1,
    "total_len": 44,
    "description": "Blake2b-256 Digest"
  },
  "G": {
    "name": "Blake2S256",
    "code": "G",
    "code_len": 1,
    "total_len": 44,
    "description": "Blake2s-256 Digest"
  },
  "H": {
    "name": "SHA3_256",
    "code": "H",
    "code_len": 1,
    "total_len": 44,
    "description": "SHA3-256 Digest"
  },
  "I": {
    "name": "SHA2_256",
    "code": "I",
    "code_len": 1,
    "total_len": 44,
    "description": "SHA2-256 Digest"
  },
  "J": {
    "name": "RandomSeed256ECDSAsecp256k1",
    "code": "J",
    "code_len": 1,
    "total_len": 44,
    "description": "Seed of ECDSA secp256k1 private key"
  },
  "K": {
    "name": "RandomSeed448",
    "code": "K",
    "code_len": 1,
    "total_len": 76,
    "description": "Seed of Ed448 private key"
  },
  "L": {
    "name": "X448",
    "code": "L",
    "code_len": 1,
    "total_len": 76,
    "description": "X448 public encryption key"
  },
  "O": {
    "name": "X25519Private",
    "code": "O",
    "code_len": 1,
    "total_len": 44,
    "description": "X25519 private decryption key"
  },
  "P": {
    "name": "X25519CipherSeed",
    "code": "P",
    "code_len": 1,
    "total_len": 124,
    "description": "X25519 124 char b64 Cipher of 44 char qb64 Seed"
  },
  "0": {
    "A": {
      "name": "Salt_128",
      "code": "0A",
      "code_len": 2,
      "total_len": 24,
      "description": "Random salt, seed, private key, or sequence number of length 128 bits"
    },
    "B": {
      "name": "Ed25519Sha512",
      "code": "0B",
      "code_len": 2,
      "total_len": 88,
      "description": "Ed25519 signature"
    },
    "C": {
      "name": "ECDSAsecp256k1Sha256",
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
      "description": "Blake3-512 Digest"
    },
    "E": {
      "name": "SHA3_512",
      "code": "0E",
      "code_len": 2,
      "total_len": 88,
      "description": "Blake2b-512 Digest"
    },
    "F": {
      "name": "Blake2B512",
      "code": "0F",
      "code_len": 2,
      "total_len": 88,
      "description": "SHA3-512 Digest"
    },
    "G": {
      "name": "SHA2_512",
      "code": "0G",
      "code_len": 2,
      "total_len": 88,
      "description": "SHA2-512 Digest"
    }
  },
  "1": {
    "A": {
      "A": {
        "A": {
          "name": "ECDSAsecp256k1NT",
          "code": "1AAA",
          "code_len": 4,
          "total_len": 51,
          "description": "ECDSA secp256k1 non-transferable prefix public verification key"
        },
        "B": {
          "name": "ECDSAsecp256k1",
          "code": "1AAB",
          "code_len": 4,
          "total_len": 51,
          "description": "ECDSA secp256k1 public verification or encryption key"
        },
        "C": {
          "name": "Ed448NT",
          "code": "1AAC",
          "code_len": 4,
          "total_len": 80,
          "description": "Ed448 non-transferable prefix public verification key"
        },
        "D": {
          "name": "Ed448",
          "code": "1AAD",
          "code_len": 4,
          "total_len": 80,
          "description": "Ed448 public verification key"
        },
        "E": {
          "name": "Ed448",
          "code": "1AAE",
          "code_len": 4,
          "total_len": 156,
          "description": "Ed448 signature"
        },
        "G": {
          "name": "datetimeB64",
          "code": "1AAG",
          "code_len": 4,
          "total_len": 36,
          "description": "DateTime Base64 custom encoded 32 char ISO-8601 DateTime"
        },
        "H": {
          "name": "X25519CipherSalt",
          "code": "1AAH",
          "code_len": 4,
          "total_len": 100,
          "description": "X25519 100 char b64 Cipher of 24 char qb64 Salt"
        }
      }
    }
  },
  "-": {
    "A": {
      "name": "...",
      "count_code_len": 2,
      "code": "-A",
      "code_len": 4,
      "total_len": 4,
      "type": "count",
      "description": "Count of attached qualified Base64 indexed controller signatures"
    },
    "C": {
      "name": "NontransferableReceiptCouples",
      "count_code_len": 2,
      "code": "-C",
      "code_len": 4,
      "total_len": 4,
      "type": "count",
      "description": "Count of attached qualified Base64 nontransferable identifier receipt couples pre+sig"
    },
    "V": {
      "name": "Frame",
      "count_code_len": 2,
      "code": "-V",
      "code_len": 4,
      "total_len": 4,
      "type": "count",
      "description": "Count of total attached grouped material qualified Base64 4 char quadlets"
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