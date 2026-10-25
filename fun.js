// let a=23;
// let b=42;
// if(a>b){
//     console.log("a is greater than b");
// }
// else{
//     console.log("b is greater than a");
// }
const arr=new Array(5);
let sum=0;
for(let i=0;i<arr.length;i++){
    arr[i]=i*2;
    sum+=arr[i];
}
// console.log(arr);
console.log(sum);
