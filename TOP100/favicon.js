const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");
ctx.font = "200px Arial";
ctx.fillText("無", 0, 150);
const link = document.createElement("link");
link.rel = "icon";
link.href = canvas.toDataURL();
document.head.appendChild(link);