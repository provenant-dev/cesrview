<template>
  <div class="container mt-5">
    <div class="form-group">
      <label for="input-textarea">Enter your CESR data here...</label>
      <textarea class="form-control" v-model="inputData" id="input-textarea" rows="8"></textarea>
    </div>
    <div class="m-5 text-center">
      <button class="btn btn-success btn-lg" @click="processInput">Process</button>
    </div>
    <div>
      <PreviewField :outputData="outputData" />
    </div>
  </div>
</template>
<script>
export default {
  data() {
    return {
      inputData: `{"v":"KERI10JSON00010c_","t":"rpy","d":"EJvtVu__NKS6hLEfOSGrdudlx2CLR_t4to9HeI6r4VtG","dt":"2023-01-20T05:25:53.684334+00:00","r":"/loc/scheme","a":{"eid":"BNwSX8dtJ_Q-jlSIcgaL9phC2qT-PwNy_z1p-QSFPGMg","scheme":"http","url":"http://witness1.main.provenant.net:5631/"}}-VAi-CABBNwSX8dtJ_Q-jlSIcgaL9phC2qT-PwNy_z1p-QSFPGMg0BC31QGGzWrHNkochCDthNw25H8CQYqd-4uoF2r6WrjKLy-w-Jk3WEf85rS8mDehSyHZcqU3dYtUbzuNiLJqORoJ{"v":"KERI10JSON00010a_","t":"rpy","d":"EJIb0gHF2v7heUfElowl3puuQPkBmU15znk5xpJEdUkT","dt":"2023-01-20T05:25:53.685390+00:00","r":"/loc/scheme","a":{"eid":"BNwSX8dtJ_Q-jlSIcgaL9phC2qT-PwNy_z1p-QSFPGMg","scheme":"tcp","url":"tcp://witness1.main.provenant.net:5632/"}}-VAi-CABBNwSX8dtJ_Q-jlSIcgaL9phC2qT-PwNy_z1p-QSFPGMg0BCrX6_BGq6oOYzFmae8kgBYkkaVV1kOEu8UKiymcjgzIV3rHSRNZU3nNFiynfYLnAMXXoP0y_K1AvLQEvvVX34J`,
      outputData: ""
    }
  },
  methods: {
    processInput() {
      console.log(this.inputData);
      if(this.inputData) {
        console.log("Parsing Started");
        let temp = this.$parseStream(this.inputData);
        this.outputData =  this.$generateCESRHtml(temp);
        console.log(this.outputData);
      }
        
    }
  }
}
</script>