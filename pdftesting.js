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
      loadPdfWithPage(currentPage, userData.comments, userData.creatorName);
    }
  };
};

// Function to load the PDF using PSPDFKit
const loadPdfWithPage = (currentPage,comments, creatorName) => {
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
        toolbarItems: [
          { type: "sidebar-thumbnails"},
          { type: "sidebar-document-outline"}, 
          { type: "sidebar-annotations"},
          { type: "pager"},  
          { type: "search" },             // Search button
          { type: "zoom-in" },            // Zoom In button
          { type: "zoom-out" },           // Zoom Out button
          { type: "annotate" },     
          { type: "text"},
          { type: "highlighter"},         // Annotation tools (text, ink, highlighter)
          { type: "print" },              // Print button
          { type: "export-pdf" }, 
          
            // Export PDF button
          // Add more valid types as needed
        ],

        isEditableComment: (comment) => {
          // Check the custom data to determine if the comment should be editable
          return comment.customData?.isEditable === false;
        },
      })
        .then(async function (instance) {
      
          // Set the creator name
          await instance.setAnnotationCreatorName(`${creatorName}`);

          // page change
          instance.addEventListener("viewState.currentPageIndex.change", () => {

            console.log("Page changed to: ", instance.viewState.currentPageIndex + 1);
            let user_id = localStorage.getItem("user_id")
              const url = `${globalURl}/save_pdf_page`;
              var xhrUrlClose = new XMLHttpRequest();

              xhrUrlClose.open("POST", url, true);
              xhrUrlClose.setRequestHeader("Content-Type", "application/json");
              xhrUrlClose.send(
                JSON.stringify({
                  user_id,
                  pdf_url: `https://images.app-pursuenetworking.com/public/files/${pdfFileName}`,
                  page: instance.viewState.currentPageIndex + 1,
                  notes: null,
                  draft: null
                })
              );
            
          });

          // create comments            
            instance.addEventListener("annotations.create", (annotations) => {
              console.log("create")
              annotations.forEach(annotation => {
                if (annotation instanceof PSPDFKit.Annotations.HighlightAnnotation) {
                  // This is the highlight created when text is selected
                  instance.getComments(annotation.id).then(comments => {
                    if (comments.size > 0) {
                      // If there are comments associated with this highlight, it's a new comment on selected text
                      const comment = comments.get(comments.size - 1);
                      saveCommentWithHighlight(annotation, comment);
                    }
                    else{
                      console.log("no size")
                    }
                  });
                }
                else{
                  console.log("not a HighlightAnnotation")
                }
              });
            });
            
            function saveCommentWithHighlight(highlight, comment) {
              const commentInfo = {
                databaseId:highlight.id, 
                pageIndex: highlight.pageIndex,
                rects: highlight.rects.toJS(),
                text: comment.text,
                creatorName: comment.creatorName,
                createdAt: comment.createdAt
              };
              localStorage.setItem("commentInfo",JSON.stringify(commentInfo))
              console.log(commentInfo)
              sendToServer(commentInfo)
              // Now you have the highlight and comment information, you can send it to your server
            }

            // add comments from server
          async function addAnnotations(instance, comments) {
              try {
                // Iterate over the array of comments retrieved from the API
                comments.forEach(async (commentInfo) => {
                  commentInfo.rects = JSON.parse(commentInfo.rects)
                  commentInfo.text = JSON.parse(commentInfo.text)
                  // Create a list of rects for the highlight
                  const rects = PSPDFKit.Immutable.List(
                    commentInfo.rects.map(rect => new PSPDFKit.Geometry.Rect(rect))
                  );
                  console.log(commentInfo.createdAt,"commentInfo.createdAt")

                  const createdAt = new Date(commentInfo.createdAt);

                  console.log(createdAt,"createdAt")
            
                  // Create the highlight annotation
                  const highlightAnnotation = new PSPDFKit.Annotations.HighlightAnnotation({
                    pageIndex: commentInfo.pageIndex,
                    rects: rects,
                    boundingBox: PSPDFKit.Geometry.Rect.union(rects),
                    createdAt: createdAt,
                    customData: {
                      originalCreatedAt: createdAt.toISOString()
                    },
                    creatorName: commentInfo.creatorName,
                  });
            
                  // Add the highlight annotation to the document
                  const [createdHighlight] = await instance.create([highlightAnnotation]);
                  console.log(highlightAnnotation.createdAt, "hight created At")
                  // Create the comment associated with the highlight
                  const comment = new PSPDFKit.Comment({
                    text: commentInfo.text, // Accessing the text value (e.g., "<p>Comment</p>")
                    pageIndex: createdHighlight.pageIndex,
                    rootId: createdHighlight.id, // Link the comment to the highlight ID
                    creatorName: commentInfo.creatorName,
                    createdAt: createdAt,
                    customData: {
                      originalCreatedAt: createdAt.toISOString(),
                      isEditable: false // Assume this is passed from your server
                    },
                  });
            
                  // Add the comment to the document
                  await instance.create(comment);            
                });
              } catch (error) {
                console.error("Error creating highlight and comment:", error);
              }
            }
                
        addAnnotations(instance, comments)

          
      })
      .catch(function (error) {
        console.error("Error loading PSPDFKit: ", error.message);
      });
    } else {
      console.error("PDF file name not found in localStorage");
    }
};

// Call the function to make the API request and load the PDF
makeApiCallAndLoadPdf();

function sendToServer(commentInfo) {

  try {

    commentInfo.user_id = localStorage.getItem("user_id")
    commentInfo.pdfUrl = `https://images.app-pursuenetworking.com/public/files/${pdfFileName}` 
    const url = `${globalURl}/save_pdf_comment`;
    var xhrUrlClose = new XMLHttpRequest();
  
    xhrUrlClose.open("POST", url, true);
    xhrUrlClose.setRequestHeader("Content-Type", "application/json");
    xhrUrlClose.send(
    JSON.stringify({
      commentInfo,
      })
    );  

  } catch (error) {

    console.log(error)
  }
    
}



