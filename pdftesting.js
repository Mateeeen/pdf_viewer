const globalURl = "https://social-login.app-pursuenetworking.com";
const urlParams = new URLSearchParams(window.location.search);
const pdfFileName = urlParams.get("pdf_file_name");
const userId = urlParams.get("user_id");

// Save to localStorage
if (pdfFileName && userId) {
  localStorage.setItem("pdf_file_name", pdfFileName);
  localStorage.setItem("user_id", userId);
}

// Function to make the API call and load the PDF
const makeApiCallAndLoadPdf = () => {
  let user_id = localStorage.getItem("user_id");
  const pdfUrl = `https://images.app-pursuenetworking.com/public/files/${pdfFileName}`;
  const apiUrl = `${globalURl}/get_pdf_page`;

  var xhrUrl = new XMLHttpRequest();
  xhrUrl.open("POST", apiUrl, true);
  xhrUrl.setRequestHeader("Content-Type", "application/json");
  xhrUrl.send(
    JSON.stringify({
      user_id,
      pdf_url: pdfUrl,
    })
  );

  xhrUrl.onreadystatechange = function () {
    if (xhrUrl.readyState == 4 && xhrUrl.status == 200) {
      let userData = JSON.parse(xhrUrl.responseText);
      let currentPage = userData.page; // Get the page from the API response

      // Load the PDF with the retrieved page
      loadPdfWithPage(currentPage);
    }
  };
};

// Function to load the PDF using PSPDFKit
const loadPdfWithPage = (currentPage) => {
  setTimeout(() => {
    const baseUrl = "https://pdf-viewer-orpin.vercel.app/Assets/";
    const pdfFileName = localStorage.getItem("pdf_file_name");

    if (pdfFileName) {
      const documentUrl = `https://social-login.app-pursuenetworking.com/public/files/${pdfFileName}`;

      PSPDFKit.load({
        baseUrl,
        container: "#pspdfkit",
        document: documentUrl,
        initialViewState: new PSPDFKit.ViewState({
          currentPageIndex: currentPage - 1,
        }),
      })
        .then(function (instance) {
          console.log("PSPDFKit loaded",instance);

          // Fetch and log annotations using supported events
          // instance.addEventListener("annotations.load", (annotations) => {
          //   annotations.forEach((annotation) => {
          //     if (annotation.type === "Text") {
          //       console.log(
          //         `Annotation Loaded (Page ${annotation.pageIndex + 1}):`,
          //         annotation.contents
          //       );
          //     }
          //   });
          // });

          // instance.addEventListener("annotations.change", (changedAnnotations) => {
          //   changedAnnotations.forEach((change) => {
          //     if (change.type === "Text") {
          //       console.log(
          //         `Annotation Changed (Page ${change.pageIndex + 1}):`,
          //         change.contents
          //       );
          //     }
          //   });
          // });

          // Additional listener for logging current page index changes
          instance.addEventListener("viewState.currentPageIndex.change", () => {
            console.log("Page changed to: ", instance.viewState.currentPageIndex + 1);
          });

          // // Additional annotation-related events
          // instance.addEventListener("annotations.create", (createdAnnotations) => {
          //   createdAnnotations.forEach((annotation) => {
          //     console.log("Annotation Created:", annotation);
          //   });
          // });

          // instance.addEventListener("annotations.delete", (deletedAnnotations) => {
          //   deletedAnnotations.forEach((annotation) => {
          //     console.log("Annotation Deleted:", annotation);
          //   });
          // });
          setTimeout(()=>{
            instance.addEventListener("annotations.create", (createdAnnotations) => {
              console.log("Annotations created:");
              createdAnnotations.forEach((annotation) => {
                console.log(`Page ${annotation.pageIndex + 1}:`, annotation.contents);
                console.log("Full Annotation Data:", annotation);
              });
            });
  
            // Example: Log all current annotations
            instance.getAnnotations().then((annotations) => {
              console.log("All annotations currently loaded:", annotations);
            });
            
          },5000)

          
        })
        .catch(function (error) {
          console.error("Error loading PSPDFKit: ", error.message);
        });
    } else {
      console.error("PDF file name not found in localStorage");
    }
  }, 5000);
};

// Call the function to make the API request and load the PDF
makeApiCallAndLoadPdf();
