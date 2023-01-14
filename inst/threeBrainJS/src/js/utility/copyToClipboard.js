import ClipboardJS from 'clipboard';

function write_clipboard_maker(){
  let btn, msg;

  return((s) => {

    if( btn === undefined ){
      btn = document.createElement("button");
      new ClipboardJS(btn, {
        text : (trigger) => {
          const s = msg;
          msg = undefined;
          return(s);
        }
      });
    }


    if( s && s !== ""){
      msg = s;
      btn.click();
    }
  });

}
const copyToClipboard = write_clipboard_maker();

export { copyToClipboard };
