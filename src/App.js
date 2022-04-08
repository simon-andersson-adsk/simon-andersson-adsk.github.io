import './App.css';
import * as postRobot from "post-robot";
import {useCallback, useEffect, useState} from "react";
import JSZip from "jszip";
import UploadSpinner from "./upload.svg"

function downloadBlob(blob, filename = "download") {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
}

const b64toBlob = (base64Blob, sliceSize=512) => {
  const contentType = base64Blob.substring(base64Blob.indexOf(":") + 1, base64Blob.indexOf(";"))
  const b64Data = base64Blob.substring(base64Blob.indexOf(",") + 1)
  const byteCharacters = atob(b64Data);
  const byteArrays = [];

  for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    const slice = byteCharacters.slice(offset, offset + sliceSize);

    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }

  const blob = new Blob(byteArrays, {type: contentType});
  return blob;
}

function App() {
  const [fullHourDates, setFullHourDates] = useState()
  const [loading, setLoading] = useState(false)

  const setCameraToCenterOfSite = useCallback(() => {
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

  return (
    <div className="App">
      {loading && <img alt="loading spinner" src={UploadSpinner} />}
      {!loading && (
        <>
          <button onClick={() => postRobot.send(window.parent, 'setCameraType', "perspective")}>Set camera to 3d</button>
          <button onClick={() => postRobot.send(window.parent, 'setCameraType', "orthographic")}>Set camera to 2d</button>
          <button onClick={setCameraToCenterOfSite}>Set camera center of site</button>
        </>
      )}
    </div>
  );
}

export default App;
