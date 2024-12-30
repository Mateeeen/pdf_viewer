 // Function to get the current page number
 function getCurrentPageNumber(instance) {
  const currentPageIndex = instance.viewState.currentPageIndex;
  // If currentPageIndex is a valid number, return the 1-based page number
  if (typeof currentPageIndex === "number" && !isNaN(currentPageIndex)) {
    return currentPageIndex + 1; // 1-based page number
  } else {
    console.error("Invalid currentPageIndex value:", currentPageIndex);
    return null;
  }
}

// Step 1: Capture query parameters and save them to localStorage
const globalURl = "https://social-login.app-pursuenetworking.com";
const urlParams = new URLSearchParams(window.location.search);
const pdfFileName = urlParams.get('pdf_file_name');
const userId = urlParams.get('user_id');

// Save to localStorage
if (pdfFileName && userId) {
  localStorage.setItem('pdf_file_name', pdfFileName);
  localStorage.setItem('user_id', userId);
}

// Step 2: Make the API call to get the user's last viewed page
const makeApiCallAndLoadPdf = () => {
  let user_id = localStorage.getItem("user_id");
  const pdfUrl = `https://social-login.app-pursuenetworking.com/public/files/${pdfFileName}`;
  const apiUrl = `${globalURl}/get_pdf_page`; // Replace `globalURl` with your actual URL

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
      console.log("Pdf count get api");
      let currentPage = userData.page; // Get the page from the API response

      // Step 3: Load the PDF using PSPDFKit
      loadPdfWithPage(currentPage);
    }
  };
};

// Step 3: Load the PDF using PSPDFKit
const loadPdfWithPage = (currentPage) => {
  setTimeout(() => {
    const baseUrl = "https://pdf-viewer-orpin.vercel.app/Assets/";
    console.log(baseUrl);

    // Get the saved values from localStorage
    const pdfFileName = localStorage.getItem('pdf_file_name');
    const userId = localStorage.getItem('user_id');

    if (pdfFileName && userId) {
      const documentUrl = `https://social-login.app-pursuenetworking.com/public/files/${pdfFileName}`;
      
      PSPDFKit.load({
        baseUrl,
        container: "#pspdfkit",
        document: documentUrl,
        initialViewState: new PSPDFKit.ViewState({
          currentPageIndex: currentPage ? currentPage - 1 : 2, // Adjust for zero-based index
        }),
      })
        .then(function (instance) {
          console.log("PSPDFKit loaded", instance);

          // Use the viewState.currentPageIndex.change event to track the current page number
          instance.addEventListener("viewState.currentPageIndex.change", function (event) {
            const currentPageNumber = getCurrentPageNumber(instance);
            if (currentPageNumber !== null) {
              console.log("Current Page Number: ", currentPageNumber);
            }
          });
        })
        .catch(function (error) {
          console.error(error.message);
        });
    } else {
      console.error('PDF file name or user ID not found in localStorage');
    }
  }, 5000);
};

// Call the function to make the API request before loading the PDF
makeApiCallAndLoadPdf();