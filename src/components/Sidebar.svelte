<script>
  import { i18n } from '../lib/i18n/loader.js';
  import { page } from '../stores.js';
  export { user };

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
      ],
    },
    {
      label: 'ADMINISTRATION',
      adminOnly: true,
      items: [
        { route: '/tenants', label: 'nav.tenants', icon: '🏢' },
        { route: '/users', label: 'nav.users', icon: '👥' },
        { route: '/health', label: 'nav.health', icon: '🖥️' },
        { route: '/system', label: 'nav.system', icon: '⚙️' },
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
    return $page === route || $page.startsWith(route + '/');
  }
</script>

<aside class="w-64 bg-white border-r border-gray-200 h-full flex flex-col overflow-y-auto">
  <nav class="flex-1 p-4 space-y-6">
    {#each sections as section}
      {#if !section.adminOnly || ($user && $user.role === 'admin')}
        <div>
          <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2">
            {$i18n.t(`nav.section.${section.label.toLowerCase()}`) || section.label}
          </h3>
          <ul class="space-y-1">
            {#each section.items as item}
              <li>
                <a
                  href="#{item.route}"
                  class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                    {isActive(item.route)
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}"
                >
                  <span class="text-lg">{item.icon}</span>
                  {$i18n.t(item.label)}
                </a>
              </li>
            {/each}
          </ul>
        </div>
      {/if}
    {/each}
  </nav>

  <div class="p-4 border-t border-gray-200">
    <p class="text-xs text-gray-400 text-center">
      Danwa Studio v0.1.0
    </p>
  </div>
</aside>