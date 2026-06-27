<script>
  import { i18n } from '../lib/i18n/loader.js';

  let { currentPage = '/', user = null } = $props();

  const sections = [
    {
      label: 'BUILD',
      items: [
        { route: '/blueprints', label: 'nav.blueprints', icon: '📐' },
        { route: '/workflow-templates', label: 'nav.workflow_templates', icon: '📋' },
        { route: '/input-composer', label: 'nav.input_composer', icon: '🎛️' },
        { route: '/output-composer', label: 'nav.output_composer', icon: '📤' },
      ],
    },
    {
      label: 'CONFIGURE',
      items: [
        { route: '/llm', label: 'nav.llm', icon: '🤖' },
        { route: '/agents', label: 'nav.agents', icon: '👤' },
        { route: '/prompts', label: 'nav.prompts', icon: '💬' },
        { route: '/roles', label: 'nav.roles', icon: '🎭' },
        { route: '/tones', label: 'nav.tones', icon: '🎨' },
        { route: '/modules', label: 'nav.modules', icon: '📦' },
      ],
    },
    {
      label: 'EXECUTE',
      items: [
        { route: '/exec', label: 'nav.exec', icon: '▶️' },
        { route: '/diff', label: 'nav.diff', icon: '🔀' },
        { route: '/replay', label: 'nav.replay', icon: '⏪' },
        { route: '/proposals', label: 'nav.proposals', icon: '💡' },
      ],
    },
    {
      label: 'EVOLVE',
      items: [
        { route: '/translations', label: 'nav.translations', icon: '🌐' },
        { route: '/modules', label: 'nav.modules', icon: '📦' },
        { route: '/catalog', label: 'nav.catalog', icon: '📚' },
        { route: '/modules/publish', label: 'Module Publishing', icon: '🚀' },
      ],
    },
    {
      label: 'SYSTEM',
      items: [
        { route: '/health', label: 'nav.health', icon: '🖥️' },
        { route: '/system', label: 'nav.system', icon: '⚙️' },
        { route: '/tenants', label: 'nav.tenants', icon: '🏢' },
        { route: '/users', label: 'nav.users', icon: '👥' },
      ],
    },
    {
      label: 'ACCOUNT',
      items: [
        { route: '/profile', label: 'nav.profile', icon: '👤' },
        { route: '/my-keys', label: 'nav.my_keys', icon: '🔑' },
      ],
    },
  ];

  function isActive(route) {
    return currentPage === route || currentPage.startsWith(route + '/');
  }
</script>

<aside class="w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 h-full flex flex-col overflow-y-auto">
  <nav class="flex-1 p-4 space-y-6">
    {#each sections as section}
      {#if true}
        <div>
          <h3 class="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-2">
            {i18n.t(`nav.section.${section.label.toLowerCase()}`) || section.label}
          </h3>
          <ul class="space-y-1">
            {#each section.items as item}
              <li>
                <a
                  href="#{item.route}"
                  class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                    {isActive(item.route)
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'}"
                >
                  <span class="text-lg">{item.icon}</span>
                  {i18n.t(item.label)}
                </a>
              </li>
            {/each}
          </ul>
        </div>
      {/if}
    {/each}
  </nav>

  <div class="p-4 border-t border-gray-200 dark:border-gray-700">
    <p class="text-xs text-gray-400 dark:text-gray-500 text-center">
      Danwa Studio v0.1.0
    </p>
  </div>
</aside>