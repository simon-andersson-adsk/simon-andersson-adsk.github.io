import './App.css';
import * as postRobot from "post-robot";
import React, {useCallback, useEffect, useState} from "react";
import UploadSpinner from "./upload.svg"
import Kratos from "./Kratos.jpeg"
import { RecoilRoot } from "recoil";
import {getSiteConfigKey} from "./utils";

function App() {
  const [buildingIdx, setBuildingIdx] = useState(0)
  useEffect(() => {
    postRobot.send(window.parent, 'setSceneType', "STATIC_BUILDINGS")
  }, [])

  const sendToKronos = useCallback(() => {
    const asyncThings = async () => {
      const siteConfig = (await postRobot.send(window.parent, 'getSiteConfig'))?.data
      const surroundingBuildings = getSiteConfigKey(siteConfig, "surrounding_building_barriers")
      const existingBuildings = getSiteConfigKey(siteConfig, "existing_building_barriers")
      const proposalGeometry = (await postRobot.send(window.parent, 'getProposalGeometry'))?.data

      console.log("Got surroundingBuildings", (surroundingBuildings?.features || []).length)
      console.log("Got existingBuildings", (existingBuildings?.features || []).length)
      console.log("Got proposalGeometry", proposalGeometry)
    }
    asyncThings()
  }, [])

  const colorBuilding0 = useCallback(() => {
    const asyncThings = async () => {
      await postRobot.send(window.parent, 'setColorOfBuilding', { buildingIndex: buildingIdx, color: [1, 0 ,0] })
      setBuildingIdx(buildingIdx+1)
    }
    asyncThings()
  }, [buildingIdx, setBuildingIdx])


  return (
    <RecoilRoot>
      <React.Suspense fallback={<img alt="loading spinner" src={UploadSpinner} />}>
        <div className="App">
          <img src={Kratos} alt={"ZUEEES"} />
          <button onClick={sendToKronos}>ZEUS!!</button>
          <button onClick={colorBuilding0}>BOY!!</button>
        </div>
      </React.Suspense>
    </RecoilRoot>
  );
}

export default App;
