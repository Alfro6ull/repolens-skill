import { useEffect, useState } from "react";
import { getActivityWorks } from "../api/activity";

export function ActivityDetailPage() {
  const [works, setWorks] = useState([]);
  useEffect(() => {
    getActivityWorks("123").then(setWorks);
  }, []);
  return <div>{works.map((work) => <img key={work.id} src={work.coverUrl} />)}</div>;
}
