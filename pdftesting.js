const globalURl = "https://social-login.app-pursuenetworking.com";
const urlParams = new URLSearchParams(window.location.search);
const pdfFileName = urlParams.get("pdf_file_name");
const userId = urlParams.get("user_id");
localStorage.removeItem("commentInfo")
localStorage.removeItem("annotationInfo")
localStorage.setItem("start",true)

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
      let comments = userData.comments;

      // Flatten the replies and merge them into the comments array
      let allComments = comments.flatMap(comment => {
          // Add the main comment to the array
          let merged = [comment];
          // Add all replies to the array
          if (Array.isArray(comment.replies)) {
              merged = merged.concat(comment.replies.map(reply => {
                  // Include additional properties for context
                  reply.parentCommentId = comment.commentId; // Link the reply to the parent comment
                  return reply;
              }));
          }
          return merged;
      });
      localStorage.setItem("allComments", JSON.stringify(allComments));
      localStorage.setItem("userImage",userData.creatorImage)
      if(userData.comments.length < 1){
        localStorage.removeItem("start")
      }
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
        enableLogging: false,
        toolbarItems: [
          { type: "sidebar-thumbnails"},
          { type: "sidebar-document-outline"}, 
          { type: "sidebar-annotations"},
          { type: "pager"},  
          { type: "search" },             // Search button
          { type: "zoom-in" },            // Zoom In button
          { type: "zoom-out" },           // Zoom Out button
          { type: "annotate" },     
          { type: "print" },              // Print button
          { type: "export-pdf" }, 
        ],

        inlineTextSelectionToolbarItems: ({ defaultItems }) => {
          // Filter the default items to keep only the comment option
          return defaultItems.filter(item => item.type === "comment");
        },

        customRenderers: {
          CommentAvatar: (comment) => {
            let avatar = null
            let allComments = JSON.parse(localStorage.getItem("allComments"))
            if(allComments.length > 0){
              for(let x = 0; x <= allComments.length; x++){
                if(allComments[x]){
                  if(allComments[x]['text']){
                    let text = JSON.parse(allComments[x]['text'])
                    if(comment['comment'].content == text.value){
                      avatar = allComments[x]['avatar']
                      break
                    }
                  }
                  else
                  {
                    avatar = localStorage.getItem("userImage")
                  }
                } 
                else
                {
                  avatar = localStorage.getItem("userImage")
                }
              }
            }
            else
            {
              avatar = localStorage.getItem("userImage")
            }
            const avatarElement = document.createElement("img");
            avatarElement.src = avatar
            avatarElement.style.borderRadius = "50%"; // Make the avatar circular
            avatarElement.style.width = "32px";
            avatarElement.style.height = "32px";
            return {
              node: avatarElement,
              append: false,
            };
          },
        },

        isEditableComment: (comment) => {
          if(comment.customData){
            if(comment.customData.isEditable == false){
              return false
            }
            else{
              return true
            }
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

          // instance.contentDocument.addEventListener(
          //   "keyup",
          //   function (event) {
          //     let annotation = instance.getSelectedAnnotation()
          //     if (annotation instanceof PSPDFKit.Annotations.HighlightAnnotation) {
          //       localStorage.setItem("annotationId",annotation.id)
          //     }
          //     else{
          //       console.log("not a highlight annotastion")
          //     }
          //   },
          //   { capture: true }
          // );


          // comment updated
          instance.addEventListener("comments.update", (updatedComments) => {
            updatedComments.forEach(comment => {
              let annotationId = localStorage.getItem("annotationId")
              const url = `${globalURl}/update_pdf_comment`;
              var xhrUrlClose = new XMLHttpRequest();
              let commentId = null
              if(comment.customData){
                commentId = comment.customData.commentId
              }else{
                commentId = comment.id
              }
              xhrUrlClose.open("POST", url, true);
              xhrUrlClose.setRequestHeader("Content-Type", "application/json");
              xhrUrlClose.send(
              JSON.stringify({
                text: comment.text,
                databaseId: annotationId,
                commentId: commentId
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
              if(annotation.customData){
                if(annotation.customData.databaseId){
                  localStorage.setItem("annotationId",annotation.customData.databaseId)            
                }
                else{
                  localStorage.setItem("annotationId",annotation.id)                       
                }
              }
              else{
                localStorage.setItem("annotationId",annotation.id)
              }
                          
            }
          });
          
          //comment deleted
          instance.addEventListener("comments.delete", (deletedComment) => {
            deletedComment.forEach(comment => {
              let annotation = localStorage.getItem("annotationId")
              let commentId = null
              if(comment.customData){
                commentId = comment.customData.commentId
              }else{
                commentId = comment.id
              }
            
              const url = `${globalURl}/delete_pdf_comment`;
              var xhrUrlClose = new XMLHttpRequest();
              xhrUrlClose.open("POST", url, true);
              xhrUrlClose.setRequestHeader("Content-Type", "application/json");
              xhrUrlClose.send(
              JSON.stringify({
                databaseId: annotation,
                commentId
                })
              );  
              xhrUrlClose.onreadystatechange = async function () {
                if (xhrUrlClose.readyState == 4 && xhrUrlClose.status == 201) {
                  let userData = JSON.parse(xhrUrlClose.responseText);
                  if(userData.deleteAnnotation){
                    try {
                      const annotations = await instance.getAnnotations(comment.pageIndex);
                      const annotationToDelete = annotations.find(a => a.id == comment.rootId);
                      if (annotationToDelete) {
                        await instance.delete(annotationToDelete);
                      }
                    } catch (error) {
                      console.error("Error deleting annotation:", error);
                    }
                  }
                }
              }
            })
          });

          // Top bar comment creation
          instance.addEventListener("comments.create", async createdComments => {
            for (const comment of createdComments) {
              if(!localStorage.getItem("start")){
                setTimeout(()=>{
                  if(localStorage.getItem("annotationInfo")){
                    const commentInfo = {
                      commentId: comment.id,
                      text: comment.text,
                      creatorName: comment.creatorName,
                      createdAt: comment.createdAt,
                    };
                    localStorage.setItem("commentInfo",JSON.stringify(commentInfo))
                  }
                  else
                  {
                    let rooId = localStorage.getItem("annotationId")
                    const commentInfo = {
                      commentId: comment.id,
                      databaseId: rooId,
                      text: comment.text,
                      pageIndex: comment.pageIndex,
                      creatorName: comment.creatorName,
                      createdAt: comment.createdAt,
                    };
                    localStorage.setItem("commentInfo",JSON.stringify(commentInfo))
                    saveReplies()
                  }
                },1500)
              }
              else{
                setTimeout(()=>{
                  localStorage.removeItem("start")
                },3000)
              }
            }
          });
        
          // create comments            
          instance.addEventListener("annotations.create", (annotations) => {
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
                      if (timeDifference <= temp_time) {
                        temp_time = timeDifference
                        mostRecentIndex = index;
                      }
                    });
          
                    if (mostRecentIndex !== null) {
                      const recentComment = comments.get(mostRecentIndex);
                      saveCommentWithHighlight(annotation, recentComment);
                    } else {
                      console.log("No comments found within the last 5 seconds.");
                    }
                  } 
                });
              } else {
                console.log("not a HighlightAnnotation");
              }
            });
          });
                   
            function saveCommentWithHighlight(highlight, comment) {
              
              const annottationInfo = {
                databaseId:highlight.id, 
                pageIndex: highlight.pageIndex,
                rects: highlight.rects.toJS(),
              };
              localStorage.setItem("annotationInfo",JSON.stringify(annottationInfo))
              openModal()
            }

            // add comments from server
            async function addAnnotations(instance, comments) {
              try {
                let c = 1
                comments.forEach(async (commentInfo) => {
                  commentInfo.rects = JSON.parse(commentInfo.rects);
                  commentInfo.text = JSON.parse(commentInfo.text);
            
                  const rects = PSPDFKit.Immutable.List(
                    commentInfo.rects.map((rect) => new PSPDFKit.Geometry.Rect(rect))
                  );
            
                  const createdAt = new Date(commentInfo.createdAt);
            
                  const colorState =
                    commentInfo.visibility === "private"
                      ? PSPDFKit.Color.LIGHT_YELLOW
                      : PSPDFKit.Color.LIGHT_BLUE;
            
                  const editable = commentInfo.user_id == localStorage.getItem("user_id");
            
                  const highlightAnnotation = new PSPDFKit.Annotations.HighlightAnnotation({
                    pageIndex: commentInfo.pageIndex,
                    rects: rects,
                    boundingBox: PSPDFKit.Geometry.Rect.union(rects),
                    createdAt: createdAt,
                    customData: {
                      originalCreatedAt: createdAt.toISOString(),
                      databaseId: commentInfo.databaseId,
                      avatarUrl: commentInfo.avatar || "https://default-avatar-url.com/avatar.png", // Default avatar fallback
                    },
                    creatorName: commentInfo.creatorName,
                    color: colorState,
                  });
            
                  const [createdHighlight] = await instance.create([highlightAnnotation]);
            
                  let comment = new PSPDFKit.Comment({
                    text: commentInfo.text,
                    pageIndex: createdHighlight.pageIndex,
                    rootId: createdHighlight.id,
                    creatorName: commentInfo.creatorName,
                    createdAt: createdAt,
                    customData: {
                      commentId: commentInfo.commentId,
                      originalCreatedAt: createdAt.toISOString(),
                      isEditable: editable,
                      avatarUrl: commentInfo.avatar || "https://default-avatar-url.com/avatar.png", // Default avatar fallback
                    },
                  });
            
                  await instance.create(comment);

                  if (commentInfo.replies) {
                    for (const reply of commentInfo.replies) {
                      const comment = new PSPDFKit.Comment({
                        text: JSON.parse(reply.text), // Use the reply's text
                        pageIndex: createdHighlight.pageIndex,
                        rootId: createdHighlight.id,
                        creatorName: reply.creatorName, // Use the reply's creator name
                        createdAt: new Date(reply.createdAt), // Convert the reply's createdAt to a Date object
                        customData: {
                          commentId: reply.commentId,
                          originalCreatedAt: new Date(reply.createdAt).toISOString(), // Original createdAt in ISO format
                          isEditable: editable,
                          avatarUrl: reply.avatar || "https://default-avatar-url.com/avatar.png", // Fallback avatar URL
                        },
                      });
                  
                      await instance.create(comment);
                    }
                  }
                  
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
  let annotationInfo = JSON.parse(localStorage.getItem("annotationInfo"))
  commentInfo.databaseId = annotationInfo.databaseId
  commentInfo.pageIndex = annotationInfo.pageIndex
  commentInfo.rects = annotationInfo.rects

  localStorage.removeItem("commentInfo")
  localStorage.removeItem("annotationInfo")

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
  let commentInfo = JSON.parse(localStorage.getItem("commentInfo"))
  let annotationInfo = JSON.parse(localStorage.getItem("annotationInfo"))
  commentInfo.databaseId = annotationInfo.databaseId
  commentInfo.pageIndex = annotationInfo.pageIndex
  commentInfo.rects = annotationInfo.rects

  localStorage.removeItem("commentInfo")
  localStorage.removeItem("annotationInfo")

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

function saveReplies(){
  let commentInfo = JSON.parse(localStorage.getItem("commentInfo"))

  try {

    commentInfo.user_id = localStorage.getItem("user_id")
    commentInfo.pdfUrl = `https://images.app-pursuenetworking.com/public/files/${pdfFileName}` 
    const url = `${globalURl}/save_pdf_comment_replies`;
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
        if(userData.message == "Comment reply saved successfully!"){
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



