import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import LevelMap from "@/pages/LevelMap";
import MissionPanel from "@/pages/MissionPanel";
import DispatchSandbox from "@/pages/DispatchSandbox";
import ResultSettlement from "@/pages/ResultSettlement";
import Encyclopedia from "@/pages/Encyclopedia";
import TeacherPanel from "@/pages/TeacherPanel";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<LevelMap />} />
          <Route path="/mission/:id" element={<MissionPanel />} />
          <Route path="/dispatch/:id" element={<DispatchSandbox />} />
          <Route path="/result/:id" element={<ResultSettlement />} />
          <Route path="/encyclopedia" element={<Encyclopedia />} />
          <Route path="/teacher" element={<TeacherPanel />} />
        </Route>
      </Routes>
    </Router>
  );
}
