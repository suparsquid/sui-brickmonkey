import { useQuery } from "@utils/hooks";

const Results = () => {
  const queryParams = useQuery();
  const total = queryParams.get("total") ?? 0;
  const correct = queryParams.get("correct") ?? 0;

  return (
    <div className="flex flex-col h-full items-center justify-center">
      <div className="flex flex-col gap-y-2 w-1/3 h-1/3">
        <h1 className="text-4xl text-center">{correct === total ? "you got all answers right, wtf." : "you retard"}</h1>
      </div>
    </div>
  );
};

export default Results;
