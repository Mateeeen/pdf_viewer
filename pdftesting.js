
setTimeout(()=>{
    const baseUrl = chrome.runtime.getURL("Assets/");
    console.log(baseUrl)

    PSPDFKit.load({
        baseUrl,
        container: "#pspdfkit",
        document: "document.pdf",
      })
        .then(function(instance) {
          console.log("PSPDFKit loaded", instance);
        })
        .catch(function(error) {
          console.error(error.message);
        });
},5000)
