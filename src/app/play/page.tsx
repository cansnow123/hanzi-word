import { GameScreen } from "@/components/game-screen";
import { parseGameSearchParams } from "@/lib/game/config";

export default async function PlayPage(props: PageProps<"/play">) {
  const searchParams = await props.searchParams;
  const config = parseGameSearchParams(searchParams);

  return <GameScreen initialConfig={config} />;
}
