<script>
  import { onMount } from 'svelte';
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
  import { getCurrentUser as _getCurrentUser } from './lib/stores/auth.svelte.js';

  i18n.init();

  let currentPage = $state(window.location.hash.slice(1) || '/');

  function handleHashChange() {
    currentPage = window.location.hash.slice(1) || '/';
  }

  onMount(() => {
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  });

  const publicRoutes = ['/login'];
  const needsAuth = $derived(!publicRoutes.includes(currentPage));

  const currentUser = $derived(_getCurrentUser());
  let user = $derived(currentUser);
  let isAuthenticated = $derived(user !== null);

  function handleLogout() {
    user = null;
    window.location.hash = '/login';
  }
</script>

<div class="min-h-screen bg-gray-50 dark:bg-gray-950">
  {#if needsAuth && !isAuthenticated}
    <LoginView bind:user />
  {:else}
    <div class="flex h-screen overflow-hidden">
      <Sidebar user={user} {currentPage} />
      <div class="flex-1 flex flex-col overflow-hidden">
        <Header {user} onlogout={handleLogout} />
        <main class="flex-1 overflow-auto p-6">
          {#if currentPage === '/'}
            <DashboardView />
          {:else if currentPage === '/blueprints'}
            <BlueprintCanvasView />
          {:else if currentPage === '/workflow-templates'}
            <WorkflowTemplatesView />
          {:else if currentPage === '/agents'}
            <LLMAgentsView />
          {:else if currentPage === '/prompts'}
            <PromptsView />
          {:else if currentPage === '/roles'}
            <RolesView />
          {:else if currentPage === '/tones'}
            <ToneProfilesView />
          {:else if currentPage === '/llm'}
            <LLMProfilesView />
          {:else if currentPage === '/modules'}
            <ModulesView />
          {:else if currentPage === '/catalog'}
            <CatalogView />
          {:else if currentPage === '/modules/publish'}
            <ModulePublishingView />
          {:else if currentPage === '/input-composer'}
            <InputComposerView />
          {:else if currentPage === '/output-composer'}
            <OutputComposerView />
          {:else if currentPage === '/exec'}
            <WorkflowExecView />
          {:else if currentPage === '/diff'}
            <DiffView />
          {:else if currentPage === '/replay'}
            <ReplayView />
          {:else if currentPage === '/proposals'}
            <ProposalsView />
          {:else if currentPage === '/translations'}
            <TranslationsView />
          {:else if currentPage === '/tenants'}
            <TenantsView />
          {:else if currentPage === '/users'}
            <UsersView />
          {:else if currentPage === '/health'}
            <ServerHealthView />
          {:else if currentPage === '/system'}
            <SystemManagementView />
          {:else if currentPage === '/profile'}
            <ProfileView {user} />
          {:else if currentPage === '/my-keys'}
            <BYOKManager />
          {:else}
            <div class="text-center py-12">
              <h2 class="text-2xl font-bold text-gray-900">Seite nicht gefunden</h2>
              <p class="text-gray-500 mt-2">Route "{ currentPage }" existiert nicht.</p>
            </div>
          {/if}
        </main>
      </div>
    </div>
  {/if}
</div>
