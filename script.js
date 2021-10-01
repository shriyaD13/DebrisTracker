// const debrisTLE = require('./debrisData');

const accessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJlNzk4ODVkYS0wMjRkLTQyN2YtODExYS0xZTgzZDY1NGVjOTUiLCJpZCI6NjgzNjQsImlhdCI6MTYzMjQ4MTUxNX0.3K7y8GNnJLhlBpYerfoWZinZnQu9i1nsvpYcXmd15-M';
const API_KEY_N2YO = 'SC6U2R-BXHD4H-KZBZWW-4SCO';
const API_KEY_RADAR = 'prj_live_pk_27e0b838d302829efc90e51b9b5fa2a560ff211c';

// initialising cesiumn with the acesstoken 
Cesium.Ion.defaultAccessToken = accessToken;

// Initialize the Cesium Viewer in the HTML element with the `cesiumContainer` ID.
const viewer = new Cesium.Viewer('cesiumContainer', {
  shouldAnimate: true,
  imageryProvider: Cesium.createWorldImagery({
    style: Cesium.IonWorldImageryStyle.AERIAL_WITH_LABELS
  }),
  baseLayerPicker: false,
  skyBox: new Cesium.SkyBox({
    sources: {
      positiveX: 'img8.jpeg',
      negativeX: 'img8.jpeg',
      positiveY: 'img8.jpeg',
      negativeY: 'img8.jpeg',
      positiveZ: 'img8.jpeg',
      negativeZ: 'img8.jpeg'
    }
  }),

  // baseLayerPicker: false, geocoder: false, homeButton: false, infoBox: false,
  // navigationHelpButton: false, sceneModePicker: false
});

// cesium viewer settings 
// viewer.scene.globe.enableLighting = true;
// viewer.animation.container.style.visibility = 'hidden';
// viewer.timeline.container.style.visibility = 'hidden';
viewer.forceResize();


// extracting the debris data from data base 
// debrisRecord data 
let debrisRec = new Array(debrisTLE.length);

// converting TLE using sattelitejs
debrisTLE.forEach((debris, i) => {
  debrisRec[i] = satellite.twoline2satrec(
    debris.TLE.split('\n')[0].trim(),
    debris.TLE.split('\n')[1].trim()
  );
})
// console.log(debrisRec[0]);





// Adjusting the cesium clock 
const totalSeconds = 60 * 60 * 6;
const timestepInSeconds = 10;
const start = Cesium.JulianDate.fromDate(new Date());
const stop = Cesium.JulianDate.addSeconds(start, totalSeconds, new Cesium.JulianDate());
viewer.clock.startTime = start.clone();
viewer.clock.stopTime = stop.clone();
viewer.clock.currentTime = start.clone();
viewer.timeline.zoomTo(start, stop);
viewer.clock.multiplier = 10;
viewer.clock.clockRange = Cesium.ClockRange.LOOP_STOP;

// Propogate each  debris point using cesium;s inbuilt function
// array to store the positions
const positionsOverTime = new Array(debrisTLE.length);
debrisRec.forEach((rec, j) => {
  positionsOverTime[j] = new Cesium.SampledPositionProperty();
  for (let i = 0; i < totalSeconds; i += timestepInSeconds) {
    const time = Cesium.JulianDate.addSeconds(start, i, new Cesium.JulianDate());
    const jsDate = Cesium.JulianDate.toDate(time);

    const positionAndVelocity = satellite.propagate(rec, jsDate);
    const gmst = satellite.gstime(jsDate);

    let p;
    // console.log(j,positionAndVelocity)
    // if(!positionAndVelocity.position) console.log(debrisTLE[j]);
    p = satellite.eciToGeodetic(positionAndVelocity.position, gmst);

    const position = Cesium.Cartesian3.fromRadians(p.longitude, p.latitude, p.height * 1000);
    positionsOverTime[j].addSample(time, position);
  }
  // if(j == 133) console.log(debrisTLE[j]);
  // Visualize the satellite with a red dot.
  let debrisColor;
  if(debrisTLE[j].name.includes('COSMOS')) debrisColor = Cesium.Color.ORANGERED;
  else if(debrisTLE[j].name.includes('FENGYUN')) debrisColor = Cesium.Color.ORANGE;
  else debrisColor = Cesium.Color.SPRINGGREEN;
  const satellitePoint = viewer.entities.add({
    id: j,
    position: positionsOverTime[j],
    name: debrisTLE[j].name,
    description: `<div>
                    <h2>NORAD ID: ${debrisTLE[j].NORADid} </h2>
                    <h2>Element Set Age: ${debrisTLE[j].age} days</h2>
                    <h2>Ecentricity: ${debrisTLE[j].ecentricities} </h2>
                    <h2>Apogee Height: ${debrisTLE[j].apogeeHeight} km</h2>
                    <h2>PerigeeHeight: ${debrisTLE[j].perigeeHeight} km</h2>
                    <h2>Inclination : ${debrisTLE[j].inclination}°</h2>
                    <h2>Period: ${debrisTLE[j].period} minutes</h2>
                  </div>
                  <div>
                    <h2>Track when this particle will pass a particular location:</h2>
                    <input type="text" name="location" id="location" placeholder="Enter a location of interest">  
                    <button class="TrackLocation">Track!</button>
                  </div>
                  `,
    point: { 
      pixelSize: 5,
      color: debrisColor
    },
    path: {
      show: true,
      width: 5,
      resolution: 1,
      // material: new Cesium.PolylineGlowMaterialProperty({
      //   glowPower: 0.3,
      //   taperPower: 0.3,
      //   color: Cesium.Color.PALEGOLDENROD,
      // }),
    }
  });

})


// Wait for globe to load then zoom out     
let initialized = false;
viewer.scene.globe.tileLoadProgressEvent.addEventListener(() => {
  if (!initialized && viewer.scene.globe.tilesLoaded === true) {
    viewer.clock.shouldAnimate = true;
    initialized = true;
    viewer.scene.camera.zoomOut(7000000);
    document.querySelector("#loading").classList.toggle('disappear', true)
  }
});




// Set the camera to follow the satellite 
// viewer.trackedEntity = satellitePoint;



// picking a debris
const displayOrbit = (id, polylines) => {
  positions = [];
  for (let i = 0; i < debrisTLE[id].period * 60; i += 10) {
    const time = Cesium.JulianDate.addSeconds(start, i, new Cesium.JulianDate());
    const jsDate = Cesium.JulianDate.toDate(time);

    const positionAndVelocity = satellite.propagate(debrisRec[id], jsDate);
    const gmst = satellite.gstime(jsDate);

    let p;
    p = satellite.eciToGeodetic(positionAndVelocity.position, gmst);

    positions.push(Cesium.Cartesian3.fromRadians(p.longitude, p.latitude, p.height * 1000));
  }


  polylines.push(viewer.entities.add({

    polyline: {

      positions: positions,

      followSurface: true,

      width: 3,

      material: Cesium.Color.RED

    }
  }));
}

const hideOrbit = (polylines) => {
  polylines.forEach((line) => viewer.entities.remove(line));
}

const polylines = [];
viewer.selectedEntityChanged.addEventListener(function (entity) {
  if (Cesium.defined(entity)) {
    displayOrbit(entity.id, polylines);
    viewer.trackedEntity = entity;
    // console.log(entity);
  } else {
    hideOrbit(polylines);
  }
});



// Disabling sandbox to allow button click
viewer.infoBox.frame.setAttribute('sandbox', 'allow-same-origin allow-popups allow-forms allow-scripts allow-top-navigation');


// Tracking the debris and using api to predict the passes
const trackLocation = async (location) => {

  const queryLocation = location.split(' ').join('+');
  // console.log(queryLocation);
  const conv = await fetch(`https://api.radar.io/v1/geocode/forward?query=${queryLocation}`, { headers: { 'Authorization': API_KEY_RADAR } })
  const resp = await conv.json();
  // console.log(resp);

  const searchLatitude = resp.addresses[0].latitude;
  const searchLongitude = resp.addresses[0].longitude;
  // console.log(searchLongitude,searchLatitude);

  if (searchLongitude && searchLatitude) {
    const id = debrisTLE[viewer.trackedEntity.id].NORADid;
    const apiURL = `https://vast-basin-51313.herokuapp.com/https://api.n2yo.com/rest/v1/satellite/radiopasses/${id}/${searchLatitude}/${searchLongitude}/0/10/40/&apiKey=${API_KEY_N2YO}`;
    const response = await fetch(apiURL, { headers: { 'X-Requested-With': 'XMLHttpRequest' } });
    const data = await response.json();
    return data;
    // console.log(data);
    // console.log("dsvcd");
  }

}

const removePassesInfo = () => {
  document.getElementById("infoTable").innerHTML = "";
  document.getElementById("toolbar").style.display = "none";
}

const showPasses = (data, location) => {
  const { info, passes } = data;
  // console.log(passes);
  const infoTable = document.getElementById('infoTable')
  const title = document.createElement("tr");
  const Titlecontent = document.createElement("td");
  Titlecontent.innerText = `${info.satname}(${info.satid}) will pass ${location} at following times`;
  title.appendChild(Titlecontent);
  const closeBtn = document.createElement("button");
  closeBtn.innerText = "x";
  closeBtn.onclick = removePassesInfo;
  const closeBtnContainer = document.createElement("td");
  closeBtnContainer.appendChild(closeBtn);
  title.appendChild(closeBtnContainer);
  infoTable.appendChild(title);

  passes.forEach((pass, i) => {
    const startTime = new Date(pass.startUTC * 1000);
    const endTime = new Date(pass.endUTC * 1000);

    const row = document.createElement("tr");
    const content = document.createElement("td");
    content.innerText = `${i}. Start Time: ${startTime} , End Time: ${endTime}`;
    row.appendChild(content);
    infoTable.appendChild(row);
  })
  const toolbar = document.getElementById("toolbar");
  toolbar.style.display = "block";

}

viewer.infoBox.frame.addEventListener('load', async function () {
  //
  // Now that the description is loaded, register a click listener inside
  // the document of the iframe.
  //
  viewer.infoBox.frame.contentDocument.body.addEventListener('click', async function (e) {
    //
    // The document body will be rewritten when the selectedEntity changes,
    // but this body listener will survive.  Now it must determine if it was
    // one of the clickable buttons.
    //
    if (e.target && e.target.className === 'TrackLocation') {
      const location = viewer.infoBox.frame.contentDocument.getElementsByName("location")[0].value;
      if (location !== '') {
        // console.log(location)
        const data = await trackLocation(location);
        if (data) showPasses(data, location);
      }
    }
  }, false);
}, false);
