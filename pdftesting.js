setTimeout(() => {

  const baseUrl = "https://pdf-viewer-orpin.vercel.app/Assets/";
  console.log(baseUrl);

  PSPDFKit.load({
    baseUrl,
    container: "#pspdfkit",
    document: "https://social-login.app-pursuenetworking.com/public/files/Einstein-Isaacson,Walter_1.pdf",
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
