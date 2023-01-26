<template>
  <div class="container mt-5">
    <div class="form-group">
      <label for="input-textarea">Enter your CESR data here...</label>
      <textarea class="form-control" id="input-textarea" rows="8"></textarea>
    </div>
    <div class="m-5 text-center">
      <button class="btn btn-primary">Process</button>
    </div>
    <div>
      <PreviewField />
    </div>
  </div>
</template>