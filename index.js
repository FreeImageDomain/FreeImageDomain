// classify image
async function classify_image(json_data, div_id, m_net, term, source){
    let url = json_data["url"];
    //geting div where images will be added
    let container_images = document.getElementById(div_id);
    //loop through images
    // loading image
    try{
        let img = new Image();
        img.crossOrigin = "anonymous";
        img.src = url;
        // Wait for the image to load before classifying
        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
        });
        const result = await m_net.classify(img);
        //console.log(result);
        if(result[0].className.toLowerCase().includes(term.toLowerCase())){
            //console.log(result[0].className, result[0].probability);
            //console.log(result);
            img.classList.add("result_image_style");
            img.alt = json_data["title"];
            img.addEventListener("click", async function(){
                await onImageClick(json_data, source);
            });
            container_images.appendChild(img);
        }
        //return predictions
        return result;
    } catch (e){
        console.warn("Error classifying image:", url, e);
        return {};
    }
}


// Function to get query parameters
function getQueryParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);  // Returns the value of the query parameter
}

// query images

async function query_images(search_term){
    let response = await fetch(`https://free-image-domain-api.vercel.app/retrieve_public_images?q=${search_term}&limit=20&license=cc0`);
    //console.log(response.status);
    if(response.status == 429){
        //console.log("Status_received", response.status);
        document.getElementById("exceeded_api_message").style.display = "block";
        await new Promise(resolve => setTimeout(resolve, 60000));
        response = await fetch(`https://free-image-domain-api.vercel.app/retrieve_public_images?q=${search_term}&limit=20&license=cc0`);
        document.getElementById("exceeded_api_message").style.display = "none";
    }
    let image_jsons = await response.json();
    return image_jsons;
}

async function query_images_met(search_term) {
    let response = await fetch(`https://free-image-domain-api.vercel.app/retrieve_met?q=${search_term}&limit=20&license=cc0`);
    let image_jsons = await response.json();
    return image_jsons;
}

// Function to execute when image is clicked

async function onImageClick(image_data, source){
    document.getElementById("selected_container").style.display = "block";
    document.getElementById("image_selected_title").textContent = image_data["title"];
    let image = document.getElementById("selected_image");
    image.alt = image_data["title"];
    image.src = image_data["url"];

    if(source == "nasa"){
        document.getElementById("author").innerHTML = `<strong>Center: </strong>${image_data["center"]}`;
        if(image_data["creator"]){
            document.getElementById("author").innerHTML = `<strong>Center: </strong>${image_data["center"]} <strong>Creator: </strong>${image_data["creator"]}`;
        }
        document.getElementById("license").innerHTML = `<strong>License: </strong><span style="color:#fb5607">While most NASA images are in the public domain, images that show identifiable individuals or external contributions may require attribution or permission for some types of use.</span>`;
    } else if(source == "library_of_congress"){
        let unrestricted = image_data["unrestriced"] == true ? "Unrestricted use" : "Restricted use";
        let access = image_data["access_restricted"] == false ? "Unrestricted access" : "Restricted access";
        if(unrestricted == undefined){
            unrestricted = "No information about wether use is restricted or not";
        }
        if(access == undefined){
            access = "no information about wether access to the image is restricted or not.";
        }
        document.getElementById("author").innerHTML = image_data["authors"] != "" ? `<strong>Author: </strong>${image_data["authors"]}`: "<strong>Author: </strong>Not specified";
        document.getElementById("license").innerHTML = `<strong>Restrictions: </strong>${unrestricted} and ${access}`;

    }else{
        document.getElementById("author").innerHTML = image_data["author"] ? `<strong>Author: </strong>${image_data["author"]}`: "<strong>Author: </strong>Not specified";
        document.getElementById("license").innerHTML = `<strong>License: </strong>${image_data["license"]}`;
    }

    document.getElementById("date").style.display = "block";
    document.getElementById("size").style.display = "block";

    if(source=="met"){
        document.getElementById("license").innerHTML = "<strong>License: </strong> public domain";
        if (image_data["beginDate"] != image_data["endDate"]){
            document.getElementById("date").innerHTML = `<strong>Estimated date range: </strong> ${image_data["beginDate"]}-${image_data["endDate"]}`;
        }else{
            document.getElementById("date").innerHTML = `<strong>Date: </strong> ${image_data["endDate"]}`; 
        }
        document.getElementById("size").style.display = "none";
    } else if(source!="iconify"){
        document.getElementById("date").innerHTML = source == "openverse" ? `<strong>Uploaded on: </strong> ${image_data["date"]}` : `<strong>Date: </strong> ${image_data["date"]}`;
        document.getElementById("size").innerHTML = `<strong>Size: </strong> ${image_data["size"][0]} x ${image_data["size"][1]}`;
    }else{
        document.getElementById("date").style.display = "none";
        document.getElementById("size").innerHTML = `<strong>Size: </strong> ${image_data["height"]} x ${image_data["height"]}`;
    }
    // Creating download button
    const image_response = await fetch(image_data["url"]);
    const imageBlog = await image_response.blob();
    const imageURL = URL.createObjectURL(imageBlog);

    let link = document.getElementById("Download_button");
    link.href = imageURL;
    link.download = image_data["title"];
}

//close image when close button is pressed

function close_popup(){
    document.getElementById("selected_container").style.display = "none";
}

// Loading window

window.onload = async function(){
    let tit = document.getElementById("search_query_title");
    query_search = getQueryParam("query");
    tit.textContent = `"${query_search}" Results - FreeImageDomain`;
    document.getElementById("Search_header").textContent = `Results for: ${query_search}`;
    for (const el of document.getElementsByName("query")){
        el.value = query_search;
    }
    if(query_search){
        let search_results = await query_images(query_search);
        // Load pre-trained model
        let s_filter = getQueryParam("aisearch");
        let m_net_model;
        if(s_filter){
            m_net_model = await mobilenet.load({
                version: 2,
                alpha: 1.0
            });
        }
        let count = 0;
        let ai_image = 6;
        let l_openverse = document.getElementById("openverse_loader");
        l_openverse.style.display = "block";

        for(const x of search_results["openverse"]){
            if (s_filter){
                await classify_image(x, "images_openverse", m_net_model, s_filter, "openverse");
                count += 1;
                if (count >= ai_image){
                    break;
                }
            } else{
                try{
                    let img = new Image();
                    img.crossOrigin = "anonymous";
                    img.src = x["url"];
                    
                    img.alt = x["title"];
                    img.classList.add("result_image_style");
                    await new Promise((resolve, reject) => {
                        img.onload = resolve;
                        img.onerror = reject;
                    });
                    img.addEventListener("click", async function(){
                        await onImageClick(x, "openverse");
                    });
                    document.getElementById("images_openverse").appendChild(img);
                } catch(e){
                    console.warn("Can not load", x["url"], e);
                }
            }
        }
        l_openverse.style.display = "none";
        count = 0;
        let l_iconify = document.getElementById("iconify_loader");
        l_iconify.style.display = "block";
        for(const x of search_results["iconfly"]){
            if(s_filter){
                await classify_image(x, "images_icons", m_net_model, s_filter, "iconify");
                count += 1;
                if (count >= ai_image){
                    break;
                }
            }else{
                try{
                    let img = new Image();
                    img.crossOrigin = "anonymous";
                    img.src = x["url"];
                    
                    img.alt = "icon";
                    img.classList.add("result_image_style");
                    await new Promise((resolve, reject) => {
                        img.onload = resolve;
                        img.onerror = reject;
                    });
                    img.addEventListener("click", async function(){
                        await onImageClick(x, "iconify");
                    });
                    document.getElementById("images_icons").appendChild(img);
                } catch(e){
                    console.warn("Can not load", x["url"], e);
                }
            }
        }
        l_iconify.style.display = "none";
        count = 0;
        let l_wikimedia = document.getElementById("wikimedia_loader");
        l_wikimedia.style.display = "block";
        for(const x of search_results["wikimedia"]){
            if(s_filter){
                await classify_image(x, "images_wikimedia", m_net_model, s_filter, "wikimedia");
                count += 1;
                if (count >= ai_image){
                    break;
                }
            } else{
                try{
                    let img = new Image();
                    img.crossOrigin = "anonymous";
                    img.src = x["url"];
                    
                    img.alt = x["title"];
                    img.classList.add("result_image_style");
                    await new Promise((resolve, reject) => {
                        img.onload = resolve;
                        img.onerror = reject;
                    });
                    img.addEventListener("click", async function(){
                        await onImageClick(x, "wikimedia");
                    });
                    document.getElementById("images_wikimedia").appendChild(img);
                } catch(e){
                    console.warn("Can not load", x["url"], e);
                }
            }
        }
        l_wikimedia.style.display = "none";
        count = 0;
        let l_nasa = document.getElementById("nasa_loader");
        l_nasa.style.display = "block";
        for(const x of search_results["nasa"]){
            if(s_filter){
                await classify_image(x, "images_nasa", m_net_model, s_filter, "nasa");
                count += 1;
                if (count >= ai_image){
                    break;
                }
            } else{
                try{
                    let img = new Image();
                    img.crossOrigin = "anonymous";
                    img.src = x["url"];
                    
                    img.alt = x["title"];
                    img.classList.add("result_image_style");
                    await new Promise((resolve, reject) => {
                        img.onload = resolve;
                        img.onerror = reject;
                    });
                    img.addEventListener("click", async function(){
                        await onImageClick(x, "nasa");
                    });
                    document.getElementById("images_nasa").appendChild(img);
                } catch(e){
                    console.warn("Can not load", x["url"], e);
                }
            }
        }
        l_nasa.style.display = "none";
        count = 0;
        let l_loc = document.getElementById("loc_loader");
        l_loc.style.display = "block";
        for(const x of search_results["library_of_congress"]){
            if (s_filter){
                await classify_image(x, "images_loc", m_net_model, s_filter, "library_of_congress");
                count += 1;
                if (count >= ai_image){
                    break;
                }
            } else{
                try{
                    let img = new Image();
                    img.crossOrigin = "anonymous";
                    img.src = x["url"];
                    
                    img.alt = "loc";
                    img.classList.add("result_image_style");
                    await new Promise((resolve, reject) => {
                        img.onload = resolve;
                        img.onerror = reject;
                    });
                    img.addEventListener("click", async function(){
                        await onImageClick(x, "library_of_congress");
                    });
                    document.getElementById("images_loc").appendChild(img);

                } catch(e){
                    console.warn("Can not load", x["url"], e);
                }
            }
        }
        l_loc.style.display = "none";
        //console.log("finish, met remaining");
        ai_image = 4;
        let met_results = await query_images_met(query_search);
        count = 0;
        let l_met = document.getElementById("met_loader");
        l_met.style.display = "block";
        for(const x of met_results){
            if(s_filter){
                await classify_image(x, "image_met", m_net_model, s_filter, "met");
                count += 1;
                if (count >= ai_image){
                    break;
                }
            } else{
                try{
                    let img = new Image();
                    img.crossOrigin = "anonymous";
                    img.src = x["url"];
                    
                    img.alt = "met";
                    img.classList.add("result_image_style");
                    await new Promise((resolve, reject) => {
                        img.onload = resolve;
                        img.onerror = reject;
                    });
                    img.addEventListener("click", async function(){
                        await onImageClick(x, "met");
                    });
                    document.getElementById("image_met").appendChild(img);
                } catch(e){
                    console.warn("Can not load", x["url"], e);
                }
            }
        }
        l_met.style.display = "none";
        //console.log("finish");
        
    }
}
