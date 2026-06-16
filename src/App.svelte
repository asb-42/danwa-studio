<script>
  import { onMount } from 'svelte';
  import { page } from './stores.js';
  import Header from './components/Header.svelte';
  import Sidebar from './components/Sidebar.svelte';
  import LoginView from './views/LoginView.svelte';
  import DashboardView from './views/DashboardView.svelte';
  import BlueprintCanvasView from './views/BlueprintCanvasView.svelte';
  import WorkflowTemplatesView from './views/WorkflowTemplatesView.svelte';
  import LLMAgentsView from './views/LLMAgentsView.svelte';
  import PromptsView from './views/PromptsView.svelte';
  import RolesView from './views/RolesView.svelte';
  import ToneProfilesView from './views/ToneProfilesView.svelte';
  import LLMProfilesView from './views/LLMProfilesView.svelte';
  import ModulesView from './views/ModulesView.svelte';
  import ModulePublishingView from './views/ModulePublishingView.svelte';
  import InputComposerView from './views/InputComposerView.svelte';
  import OutputComposerView from './views/OutputComposerView.svelte';
  import WorkflowExecView from './views/WorkflowExecView.svelte';
  import DiffView from './views/DiffView.svelte';
  import ReplayView from './views/ReplayView.svelte';
  import ProposalsView from './views/ProposalsView.svelte';
  import TranslationsView from './views/TranslationsView.svelte';
  import TenantsView from './views/TenantsView.svelte';
  import UsersView from './views/UsersView.svelte';
  import ServerHealthView from './views/ServerHealthView.svelte';
  import SystemManagementView from './views/SystemManagementView.svelte';
  import ProfileView from './views/ProfileView.svelte';
  import BYOKManager from './views/BYOKManager.svelte';
  import { i18n } from './lib/i18n/loader.js';

  // Initialize i18n
  i18n.init();

  // Hash-based routing
  function handleHashChange() {
    const hash = window.location.hash.slice(1) || '/';
    page.set(hash);
  }

  onMount(() => {
    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();
    return () => window.removeEventListener('hashchange', handleHashChange);
  });

  // Check if route requires auth
  const publicRoutes = ['/login'];
  $: isPublicRoute = publicRoutes.includes($page);
  $: needsAuth = !$isPublicRoute;

  // Mock auth store - will be replaced with real auth
  let user = $state(null);
  let isAuthenticated = $derived(user !== null);
</script>

<div class="min-h-screen bg-gray-50">
  {#if needsAuth && !isAuthenticated}
    <LoginView bind:user />
  {:else}
    <div class="flex h-screen overflow-hidden">
      <Sidebar {user} />
      <div class="flex-1 flex flex-col overflow-hidden">
        <Header {user} />
        <main class="flex-1 overflow-auto p-6">
          {#switch $page}
            {#case '/'}
              <DashboardView />
            {#case '/blueprints'}
              <BlueprintCanvasView />
            {#case '/workflow-templates'}
              <WorkflowTemplatesView />
            {#case '/agents'}
              <LLMAgentsView />
            {#case '/prompts'}
              <PromptsView />
            {#case '/roles'}
              <RolesView />
            {#case '/tones'}
              <ToneProfilesView />
            {#case '/llm'}
              <LLMProfilesView />
            {#case '/modules'}
              <ModulesView />
            {#case '/modules/publish'}
              <ModulePublishingView />
            {#case '/input-composer'}
              <InputComposerView />
            {#case '/output-composer'}
              <OutputComposerView />
            {#case '/exec'}
              <WorkflowExecView />
            {#case '/diff'}
              <DiffView />
            {#case '/replay'}
              <ReplayView />
            {#case '/proposals'}
              <ProposalsView />
            {#case '/translations'}
              <TranslationsView />
            {#case '/tenants'}
              <TenantsView />
            {#case '/users'}
              <UsersView />
            {#case '/health'}
              <ServerHealthView />
            {#case '/system'}
              <SystemManagementView />
            {#case '/profile'}
              <ProfileView {user} />
            {#case '/my-keys'}
              <BYOKManager />
            {:default}
              <div class="text-center py-12">
                <h2 class="text-2xl font-bold text-gray-900">Seite nicht gefunden</h2>
                <p class="text-gray-500 mt-2">Route "{ $page }" existiert nicht.</p>
              </div>
          {/switch}
        </main>
      </div>
    </div>
  {/if}
</div>