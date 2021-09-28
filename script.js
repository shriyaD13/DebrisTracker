// const debrisTLE = require('./debrisData');

const accessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJlNzk4ODVkYS0wMjRkLTQyN2YtODExYS0xZTgzZDY1NGVjOTUiLCJpZCI6NjgzNjQsImlhdCI6MTYzMjQ4MTUxNX0.3K7y8GNnJLhlBpYerfoWZinZnQu9i1nsvpYcXmd15-M';


// initialising cesiumn with the acesstoken 
Cesium.Ion.defaultAccessToken = accessToken;

// Initialize the Cesium Viewer in the HTML element with the `cesiumContainer` ID.
const viewer = new Cesium.Viewer('cesiumContainer', {
  shouldAnimate: true,
  imageryProvider: Cesium.createWorldImagery({
    style: Cesium.IonWorldImageryStyle.AERIAL_WITH_LABELS
  }),
  baseLayerPicker: false,
  skyBox : new Cesium.SkyBox({
    sources : {
      positiveX : 'img1.jpeg',
      negativeX : 'img1.jpeg',
      positiveY : 'img1.jpeg',
      negativeY : 'img1.jpeg',
      positiveZ : 'img1.jpeg',
      negativeZ : 'img1.jpeg'
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

  // Visualize the satellite with a red dot.
  const satellitePoint = viewer.entities.add({
    id: j,
    position: positionsOverTime[j],
    name: debrisTLE[j].name,
    description: `<div>
                    <h2>Element Set Age: ${debrisTLE[j].age} days</h2>
                    <h2>Ecentricity: ${debrisTLE[j].ecentricities} </h2>
                    <h2>Apogee Height: ${debrisTLE[j].apogeeHeight} km</h2>
                    <h2>PerigeeHeight: ${debrisTLE[j].perigeeHeight} km</h2>
                    <h2>Inclination : ${debrisTLE[j].inclination}°</h2>
                    <h2>Period: ${debrisTLE[j].period} minutes</h2>
                  </div>`,
    point: { pixelSize: 5, color: Cesium.Color.DIMGREY},
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
  for(let i=0; i<debrisTLE[id].period * 60; i += 10)
  {
    const time = Cesium.JulianDate.addSeconds(start, i, new Cesium.JulianDate());
    const jsDate = Cesium.JulianDate.toDate(time);

    const positionAndVelocity = satellite.propagate(debrisRec[id], jsDate);
    const gmst = satellite.gstime(jsDate);

    let p;
    p = satellite.eciToGeodetic(positionAndVelocity.position, gmst);

    positions.push(Cesium.Cartesian3.fromRadians(p.longitude, p.latitude, p.height * 1000));
  }
  

  // const ag = debrisTLE[id].apogeeHeight * 1000;
  // const pg = debrisTLE[id].perigeeHeight * 1000;
  // const e = debrisTLE[id].ecentricities;
  // var semiMajorAxis = (ag + pg) / 2;
  // var semiMinorAxis = semiMajorAxis * Math.sqrt(1 - Math.pow(e, 2));

  // var positions = [];

  // for (var i = -180; i <= 180; i += 10) {

  //   var axis = semiMinorAxis + Math.cos(i * Math.PI / 180.0) * (semiMajorAxis - semiMinorAxis);
  //   // var radius = semiMajorAxis * (1- Math.pow(e, 2)) / (1 + e * Math.cos(Cesium.Math.toRadians(i)));
  //   // positions.push(Cesium.Cartesian3.fromDegrees(i, 0, axis));
  //   var inclination_m = Cesium.Matrix3.fromRotationY(-1 * Cesium.Math.toRadians(debrisTLE[id].inclination));
  //   var rotated = Cesium.Matrix3.multiplyByVector(inclination_m, Cesium.Cartesian3.fromDegrees(i, 0, axis), new Cesium.Cartesian3());
  //   // console.log(rotated);
  //   positions.push(rotated);

  // }

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



