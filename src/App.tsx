import { Game } from './features/game/Game';
import { SettingsDialog } from './features/settings/components/SettingsDialog';
import { useUserSettingsStore } from './stores/userSettings';

function App() {
  const setBalance = useUserSettingsStore((state) => state.setBalance);
  const setSelectedVariant = useUserSettingsStore((state) => state.setSelectedVariant);
  const setPayTableForVariant = useUserSettingsStore((state) => state.setPayTableForVariant);

  return (
    <>
      <Game />
      <SettingsDialog
        onApplySettings={({ balance, variant, pays }) => {
          setSelectedVariant(variant);
          setPayTableForVariant(variant, pays);
          setBalance(balance);
        }}
      />
    </>
  );
}

export default App;
