
        const input =document.getElementById('input');
        const add = document.getElementById('add');
        const taskList = document.getElementById('tasklist');

     function inputchange(){
        console.log("something entered");
     }
     add.addEventListener('click',()=>{

        const text=input.value.trim();
        if(text===''){
            console.log("please enter a task");
            return;
        }
     
     
     const litem=document.createElement('li');
     const spanitem=document.createElement('span');
     spanitem.textContent=text;
     
     const deletebutton=document.createElement('button');
      deletebutton.textContent = 'Delete';
  
     deletebutton.addEventListener('click',
       ()=>{
        litem.remove()
       }
       )
       litem.append(spanitem);
       litem.append(deletebutton);
       taskList.append(litem);

       input.value='';

       input.focus();

       });
       input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') add.click();
});
     