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
  import CatalogView from './views/CatalogView.svelte';
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

  // Check if route requires auth (Svelte 5: $derived, not legacy $:)
  const publicRoutes = ['/login'];
  const isPublicRoute = $derived(publicRoutes.includes($page));
  const needsAuth = $derived(!isPublicRoute);

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
          {#if $page === '/'}
            <DashboardView />
          {:else if $page === '/blueprints'}
            <BlueprintCanvasView />
          {:else if $page === '/workflow-templates'}
            <WorkflowTemplatesView />
          {:else if $page === '/agents'}
            <LLMAgentsView />
          {:else if $page === '/prompts'}
            <PromptsView />
          {:else if $page === '/roles'}
            <RolesView />
          {:else if $page === '/tones'}
            <ToneProfilesView />
          {:else if $page === '/llm'}
            <LLMProfilesView />
          {:else if $page === '/modules'}
            <ModulesView />
          {:else if $page === '/catalog'}
            <CatalogView />
          {:else if $page === '/modules/publish'}
            <ModulePublishingView />
          {:else if $page === '/input-composer'}
            <InputComposerView />
          {:else if $page === '/output-composer'}
            <OutputComposerView />
          {:else if $page === '/exec'}
            <WorkflowExecView />
          {:else if $page === '/diff'}
            <DiffView />
          {:else if $page === '/replay'}
            <ReplayView />
          {:else if $page === '/proposals'}
            <ProposalsView />
          {:else if $page === '/translations'}
            <TranslationsView />
          {:else if $page === '/tenants'}
            <TenantsView />
          {:else if $page === '/users'}
            <UsersView />
          {:else if $page === '/health'}
            <ServerHealthView />
          {:else if $page === '/system'}
            <SystemManagementView />
          {:else if $page === '/profile'}
            <ProfileView {user} />
          {:else if $page === '/my-keys'}
            <BYOKManager />
          {:else}
            <div class="text-center py-12">
              <h2 class="text-2xl font-bold text-gray-900">Seite nicht gefunden</h2>
              <p class="text-gray-500 mt-2">Route "{ $page }" existiert nicht.</p>
            </div>
          {/if}
        </main>
      </div>
    </div>
  {/if}
</div>