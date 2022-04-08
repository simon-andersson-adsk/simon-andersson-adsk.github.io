import './App.css';
import * as postRobot from "post-robot";
import React, {useCallback, useEffect, useState} from "react";
import JSZip from "jszip";
import UploadSpinner from "./upload.svg"
import Heatmap from "./heatmap.jpg"
import {b64toBlob, downloadBlob, getFeatureCollectionArea} from "./utils";
import SunStudy from "./SunStudy";
import { RecoilRoot } from "recoil";

function App() {
  const [fullHourDates, setFullHourDates] = useState()
  const [loading, setLoading] = useState(false)
  const [areaOfBuildLimit, setAreaOfBuildLimit] = useState()

  const getPicturesEachHour = useCallback(() => {
    if(!fullHourDates) return
    const asyncThings = async () => {
      setLoading(true)
      const siteConfigRes = await postRobot.send(window.parent, 'getSiteConfig')
      const siteConfig = siteConfigRes.data
      const buildingLimits = siteConfig.find(sc => sc.key === "building_limits").value.features
      const coords = buildingLimits.flatMap(bl => bl.geometry.coordinates[0])
      const xMiddle = (coords.reduce((acc, c) => acc + c[0], 0)/coords.length)
      const yMiddle = (coords.reduce((acc, c) => acc + c[1], 0)/coords.length)
      await postRobot.send(window.parent, 'setCameraType', "orthographic")
      await postRobot.send(window.parent, 'rotateCameraToTheta', 0)
      await postRobot.send(window.parent, 'setCameraPosition', [xMiddle, yMiddle, 1000])

      const blobsPerHour = []
      for (const date of fullHourDates) {
        postRobot.send(window.parent, 'setTimeOfDay', date)

        const base64BlobRes = await postRobot.send(window.parent, 'takePrintScreenOfScene')
        blobsPerHour.push({blob: b64toBlob(base64BlobRes.data), hour: date.getHours()});
      }

      const zip = new JSZip();
      blobsPerHour.forEach(({ blob, hour }, i) => {
        zip.file(`sun_at_hour_${hour}.png`, blob);
      });
      await new Promise(resolve =>
        zip.generateAsync({ type: "blob" }).then(function (content) {
          downloadBlob(content, `sun_study.zip`);
          setLoading(false)
          resolve();
        }),
      );
    }
    asyncThings()
  }, [fullHourDates])


  const calculateBuildLimit = useCallback(() => {
    const asyncThings = async () => {
      setLoading(true)
      const siteConfigRes = await postRobot.send(window.parent, 'getSiteConfig')
      const siteConfig = siteConfigRes.data
      const buildingLimits = siteConfig.find(sc => sc.key === "building_limits").value
      const areaOfBL = getFeatureCollectionArea(buildingLimits);
      setAreaOfBuildLimit(Math.round(areaOfBL/(1000*1000)))
      setLoading(false)
    }
    asyncThings()
  }, [fullHourDates])

  const setCameraToCenterOfScene = useCallback(() => {
    const asyncThings = async () => {
      const siteConfigRes = await postRobot.send(window.parent, 'getSiteConfig')
      const siteConfig = siteConfigRes.data
      const buildingLimits = siteConfig.find(sc => sc.key === "building_limits").value.features
      const coords = buildingLimits.flatMap(bl => bl.geometry.coordinates[0])
      const xMiddle = (coords.reduce((acc, c) => acc + c[0], 0)/coords.length)
      const yMiddle = (coords.reduce((acc, c) => acc + c[1], 0)/coords.length)
      await postRobot.send(window.parent, 'setCameraType', "orthographic")
      await postRobot.send(window.parent, 'rotateCameraToTheta', 0)
      await postRobot.send(window.parent, 'setCameraPosition', [0, 0, 10])
    }
    asyncThings()
  }, [fullHourDates])

  useEffect(() => {
    const asyncThings = async () => {
      const sunRes = await postRobot.send(window.parent, 'getSunState')
      const fullHourOffsets = sunRes.data.positions.offsets.filter(offset => offset.minute === 0)
      const datesToToggleBetween = fullHourOffsets.map(offset => {
        const now = new Date()
        now.setHours(offset.hour, 0, 0, 0)
        return now
      })
      setFullHourDates(datesToToggleBetween)
    }
    asyncThings()
  }, [setFullHourDates])

  const sendHeatmap = useCallback(() => {
    const asyncThings = async () => {
      const test = Heatmap
      const res = await fetch(test)
      const blob = await res.blob()
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      const base64data = await new Promise(res => {
        reader.onloadend = function () {
          res(reader.result);
        };
      });
      await postRobot.send(window.parent, 'setHeatMap', {heatmap: base64data})
    }
    asyncThings()
  }, [])

  return (
    <RecoilRoot>
      <React.Suspense fallback={<img alt="loading spinner" src={UploadSpinner} />}>
        <div className="App">
          {loading && <img alt="loading spinner" src={UploadSpinner} />}
          {!loading && (
            <>
              <button onClick={() => postRobot.send(window.parent, 'setCameraType', "perspective")}>Set camera to 3d</button>
              <button onClick={() => postRobot.send(window.parent, 'setCameraType', "orthographic")}>Set camera to 2d</button>
              <button onClick={getPicturesEachHour}>Get pictures each hour</button>
              <button onClick={setCameraToCenterOfScene}>Set camera center of site</button>
              <button onClick={calculateBuildLimit}>Calculate build limit area</button>
              <button onClick={sendHeatmap}>Send Heatmap</button>
              <SunStudy />
            </>
          )}
          {areaOfBuildLimit && <div>Build limit area: {areaOfBuildLimit} km^2</div>}
        </div>
      </React.Suspense>
    </RecoilRoot>
  );
}

export default App;
