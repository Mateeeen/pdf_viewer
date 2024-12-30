setTimeout(() => {
  const baseUrl = "https://images.app-pursuenetworking.com/public/files/OOPSessional2.pdf";
  console.log(baseUrl);

  PSPDFKit.load({
    baseUrl,
    container: "#pspdfkit",
    document: "document.pdf",
    initialViewState: new PSPDFKit.ViewState({
      currentPageIndex: 2, // Page numbers are zero-based, so page 5 is index 4.
    }),
  })
    .then(function (instance) {
      console.log("PSPDFKit loaded", instance);
    })
    .catch(function (error) {
      console.error(error.message);
    });
}, 5000);
