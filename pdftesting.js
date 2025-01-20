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
          if(comment.customData){
            return false
          }
          else{
            return true
          }
          // Check the custom data to determine if the comment should be editable
        },

        customUI: {
          [PSPDFKit.UIElement.Sidebar]: {
            [PSPDFKit.SidebarMode.DOCUMENT_OUTLINE]({ containerNode }) {
              // Add custom scrolling logic here
              containerNode.style.overflowY = 'auto';
              containerNode.style.maxHeight = '100%';
              return {
                node: containerNode
              };
            }
          }
        }
        
      })
        .then(async function (instance) {
      
          // Set the creator name
          await instance.setAnnotationCreatorName(`${creatorName}`);

          // page change
          instance.addEventListener("viewState.currentPageIndex.change", () => {

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

          instance.contentDocument.addEventListener(
            "keyup",
            function (event) {
              let annotation = instance.getSelectedAnnotation()
              if (annotation instanceof PSPDFKit.Annotations.HighlightAnnotation) {
                localStorage.setItem("annotationId",annotation.id)
              }
              else{
                console.log("not a highlight annotastion")
              }
            },
            { capture: true }
          );


          // comment updated
          instance.addEventListener("comments.update", (updatedComments) => {
            updatedComments.forEach(comment => {
              console.log("Updated comment:", comment.text);
              let annotationId = localStorage.getItem("annotationId")
              const url = `${globalURl}/update_pdf_comment`;
              var xhrUrlClose = new XMLHttpRequest();
            
              xhrUrlClose.open("POST", url, true);
              xhrUrlClose.setRequestHeader("Content-Type", "application/json");
              xhrUrlClose.send(
              JSON.stringify({
                text: comment.text,
                databaseId: annotationId
                })
              );  
              xhrUrlClose.onreadystatechange = function () {
                if (xhrUrlClose.readyState == 4 && xhrUrlClose.status == 201) {
                  let userData = JSON.parse(xhrUrlClose.responseText);
                  
                }
              } 
            });
          });

          instance.addEventListener("annotationSelection.change", (selectedAnnotations) => {
            let annotation = instance.getSelectedAnnotation()
            if (annotation instanceof PSPDFKit.Annotations.HighlightAnnotation) {
              console.log(annotation.id)
              localStorage.setItem("annotationId",annotation.id)            
            }
          });

          //comment deleted

          instance.addEventListener("annotations.delete", (deletedAnnotations) => {
            console.log("delete")
            let annotation = localStorage.getItem("annotationId")
            console.log(annotation);
                const url = `${globalURl}/delete_pdf_comment`;
                var xhrUrlClose = new XMLHttpRequest();
                xhrUrlClose.open("POST", url, true);
                xhrUrlClose.setRequestHeader("Content-Type", "application/json");
                xhrUrlClose.send(
                JSON.stringify({
                  databaseId: annotation
                  })
                );  
                xhrUrlClose.onreadystatechange = function () {
                  if (xhrUrlClose.readyState == 4 && xhrUrlClose.status == 201) {
                    let userData = JSON.parse(xhrUrlClose.responseText);
                    
                  }
                }
              
          });
        
          // create comments            
          instance.addEventListener("annotations.create", (annotations) => {
            console.log("create");
            annotations.forEach((annotation) => {
              if (annotation instanceof PSPDFKit.Annotations.HighlightAnnotation) {
                // This is the highlight created when text is selected
                instance.getComments(annotation.id).then((comments) => {
                  if (comments.size > 0) {          
                    // Initialize with the current date and time
                    let mostRecentIndex = null;
                    const now = new Date(); // Current date and time
                    let temp_time = 100000000
                    comments.forEach((comment, index) => {
                      const commentDate = new Date(comment.createdAt);
                      const timeDifference = Math.abs(now - commentDate) / 1000; // Difference in seconds
                      console.log(timeDifference,"time")
                      if (timeDifference <= temp_time) {
                        temp_time = timeDifference
                        mostRecentIndex = index;
                      }
                    });
          
                    if (mostRecentIndex !== null) {
                      const recentComment = comments.get(mostRecentIndex);
                      console.log("Comment within 5 seconds:", recentComment);
                      saveCommentWithHighlight(annotation, recentComment);
                    } else {
                      console.log("No comments found within the last 5 seconds.");
                    }
                  } else {
                    console.log("no size");
                  }
                });
              } else {
                console.log("not a HighlightAnnotation");
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
              openModal()
              // sendToServerPublic(commentInfo)
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

                  const createdAt = new Date(commentInfo.createdAt);
            
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

function openModal(){
  document.getElementById("commentModal").style.display = "flex"
  document.getElementById("commentModal").style.visibility = "visible"
  document.getElementById("commentModal").style.opacity = "1"
}

if (document.getElementById("privateButton")) {
  document.getElementById("privateButton").addEventListener("click", sendToServerPrivate);
}

if (document.getElementById("publicButton")) {
  document.getElementById("publicButton").addEventListener("click", sendToServerPublic);
}

function sendToServerPublic() {
  let commentInfo = JSON.parse(localStorage.getItem("commentInfo"))
  console.log(commentInfo)
  console.log("public")
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
    xhrUrlClose.onreadystatechange = function () {
      if (xhrUrlClose.readyState == 4 && xhrUrlClose.status == 201) {
        let userData = JSON.parse(xhrUrlClose.responseText);
        if(userData.message == "Comment saved successfully!"){
          document.getElementById("commentModal").style.visibility = "hidden"
          document.getElementById("commentModal").style.opacity = "0"
        }
        else
        {
          document.getElementById("commentModal").style.visibility = "hidden"
          document.getElementById("commentModal").style.opacity = "0"
        }
      }
    } 

  } catch (error) {
    console.log(error)
  }
}

function sendToServerPrivate(){
  console.log("Private")
  let commentInfo = JSON.parse(localStorage.getItem("commentInfo"))
  console.log(commentInfo)
  console.log("public")
  try {

    commentInfo.user_id = localStorage.getItem("user_id")
    commentInfo.pdfUrl = `https://images.app-pursuenetworking.com/public/files/${pdfFileName}` 
    const url = `${globalURl}/save_pdf_comment_private`;
    var xhrUrlClose = new XMLHttpRequest();
  
    xhrUrlClose.open("POST", url, true);
    xhrUrlClose.setRequestHeader("Content-Type", "application/json");
    xhrUrlClose.send(
    JSON.stringify({
      commentInfo,
      })
    ); 
    xhrUrlClose.onreadystatechange = function () {
      if (xhrUrlClose.readyState == 4 && xhrUrlClose.status == 201) {
        let userData = JSON.parse(xhrUrlClose.responseText);
        if(userData.message == "Comment saved successfully!"){
          document.getElementById("commentModal").style.visibility = "hidden"
          document.getElementById("commentModal").style.opacity = "0"
        }
        else
        {
          document.getElementById("commentModal").style.visibility = "hidden"
          document.getElementById("commentModal").style.opacity = "0"
        }
      }
    } 

  } catch (error) {
    console.log(error)
  }
}



