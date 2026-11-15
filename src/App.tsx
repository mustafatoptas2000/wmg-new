import { useCallback, useEffect, useState } from 'react';
import { AppShell } from './components/layout/AppShell';
import { LanguageProvider } from './i18n/LanguageContext';
import { loadFleet, saveFleet } from './services/fleetService';
import { marinaService } from './services/marinaService';
import { getMarineWeather } from './services/weatherService';
import {
  Marina,
  MarineWeatherReport,
  NavigationSection,
  Vessel,
  WeatherSourceMode,
} from './types/maritime';
import { DigitalToolsView } from './views/DigitalToolsView';
import { DocumentsView } from './views/DocumentsView';
import { FleetVesselsView } from './views/FleetVesselsView';
import { HomeDashboardView } from './views/HomeDashboardView';
import { MarineWeatherView } from './views/MarineWeatherView';
import { MaritimeServicesView } from './views/MaritimeServicesView';
import { NauticalChartView } from './views/NauticalChartView';
import { WorldMarinasView } from './views/WorldMarinasView';

function WorldMarineGlobalApp() {
  const [marinas, setMarinas] = useState<Marina[]>(() => marinaService.getAll());
  const [activeSection, setActiveSection] = useState<NavigationSection>(NavigationSection.HOME);
  const [selectedMarina, setSelectedMarina] = useState<Marina>(
    () => marinas.find((m) => m.id === 'tr-bodrum-yalikavak') ?? marinas[0],
  );

  const [weatherSourceMode, setWeatherSourceMode] = useState<WeatherSourceMode>(
    WeatherSourceMode.DEMONSTRATION,
  );
  const [weatherReport, setWeatherReport] = useState<MarineWeatherReport | null>(null);
  const [weatherLoading, setWeatherLoading] = useState<boolean>(false);
  const [apiFallbackNote, setApiFallbackNote] = useState<string | undefined>(undefined);

  const [vessels, setVessels] = useState<Vessel[]>(() => loadFleet());

  const loadWeather = useCallback(
    async (marina: Marina, mode: WeatherSourceMode) => {
      setWeatherLoading(true);
      setApiFallbackNote(undefined);
      const { report, apiFallbackReason } = await getMarineWeather(marina, mode);
      setWeatherReport(report);
      setApiFallbackNote(apiFallbackReason);
      setWeatherLoading(false);
    },
    [],
  );

  useEffect(() => {
    void loadWeather(selectedMarina, weatherSourceMode);
  }, [selectedMarina, weatherSourceMode, loadWeather]);

  const handleAddMarina = (input: Parameters<typeof marinaService.registerMarina>[0]) => {
    const created = marinaService.registerMarina(input);
    setMarinas([...marinaService.getAll()]);
    setSelectedMarina(created);
  };

  const handleAddVessel = (vessel: Vessel) => {
    const updated = [vessel, ...vessels];
    setVessels(updated);
    saveFleet(updated);
  };

  const handleUpdateVessel = (updatedVessel: Vessel) => {
    const updated = vessels.map((v) => (v.id === updatedVessel.id ? updatedVessel : v));
    setVessels(updated);
    saveFleet(updated);
  };

  const handleInspectOnGlobe = (marina: Marina) => {
    setSelectedMarina(marina);
    setActiveSection(NavigationSection.HOME);
  };

  const handleInspectWeather = (marina: Marina) => {
    setSelectedMarina(marina);
    setActiveSection(NavigationSection.WEATHER);
  };

  const handleRefreshWeather = () => {
    if (weatherSourceMode !== WeatherSourceMode.OPEN_METEO_API) {
      setWeatherSourceMode(WeatherSourceMode.OPEN_METEO_API);
    } else {
      void loadWeather(selectedMarina, WeatherSourceMode.OPEN_METEO_API);
    }
  };

  return (
    <AppShell
      activeSection={activeSection}
      onNavigate={setActiveSection}
      marinas={marinas}
      selectedMarina={selectedMarina}
      onSelectMarina={setSelectedMarina}
    >
      {activeSection === NavigationSection.HOME && (
        <HomeDashboardView
          marinas={marinas}
          selectedMarina={selectedMarina}
          onSelectMarina={setSelectedMarina}
          weatherReport={weatherReport}
          vessels={vessels}
          onNavigate={setActiveSection}
        />
      )}

      {activeSection === NavigationSection.NAUTICAL_CHART && (
        <NauticalChartView
          marinas={marinas}
          selectedMarina={selectedMarina}
          onSelectMarina={setSelectedMarina}
          weatherReport={weatherReport}
          weatherSourceMode={weatherSourceMode}
          onChangeSourceMode={setWeatherSourceMode}
          onRefreshWeather={handleRefreshWeather}
          weatherLoading={weatherLoading}
        />
      )}

      {activeSection === NavigationSection.WEATHER && (
        <MarineWeatherView
          marinas={marinas}
          selectedMarina={selectedMarina}
          onSelectMarina={setSelectedMarina}
          weatherReport={weatherReport}
          weatherSourceMode={weatherSourceMode}
          onChangeSourceMode={setWeatherSourceMode}
          onRefreshWeather={handleRefreshWeather}
          loading={weatherLoading}
          apiFallbackNote={apiFallbackNote}
        />
      )}

      {activeSection === NavigationSection.MARINAS && (
        <WorldMarinasView
          marinas={marinas}
          selectedMarina={selectedMarina}
          onSelectMarina={setSelectedMarina}
          onAddMarina={handleAddMarina}
          onInspectOnGlobe={handleInspectOnGlobe}
          onInspectWeather={handleInspectWeather}
        />
      )}

      {activeSection === NavigationSection.FLEET && (
        <FleetVesselsView
          vessels={vessels}
          marinas={marinas}
          onAddVessel={handleAddVessel}
          onUpdateVessel={handleUpdateVessel}
        />
      )}

      {activeSection === NavigationSection.SERVICES && (
        <MaritimeServicesView marinas={marinas} selectedMarina={selectedMarina} />
      )}

      {activeSection === NavigationSection.TOOLS && (
        <DigitalToolsView marinas={marinas} selectedMarina={selectedMarina} />
      )}

      {activeSection === NavigationSection.DOCUMENTS && <DocumentsView />}
    </AppShell>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <WorldMarineGlobalApp />
    </LanguageProvider>
  );
}
