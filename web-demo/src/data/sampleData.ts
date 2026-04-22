import type { MindNode } from '../types';

export const sampleData: MindNode = {
  id: 'root',
  title: '产品开发计划',
  children: [
    {
      id: '1',
      title: '需求分析',
      status: 'done',
      owner: '张三',
      children: [
        {
          id: '1-1',
          title: '用户调研',
          status: 'done',
          owner: '李四',
          children: [
            { id: '1-1-1', title: '问卷设计' },
            { id: '1-1-2', title: '用户访谈' },
            { id: '1-1-3', title: '数据分析' },
          ],
        },
        {
          id: '1-2',
          title: '竞品分析',
          status: 'done',
          owner: '张三',
          children: [
            { id: '1-2-1', title: 'XMind 研究' },
            { id: '1-2-2', title: 'MindNode' },
          ],
        },
        {
          id: '1-3',
          title: 'PRD 文档',
          status: 'done',
          owner: '张三',
        },
      ],
    },
    {
      id: '2',
      title: 'UI/UX 设计',
      status: 'doing',
      owner: '王五',
      children: [
        {
          id: '2-1',
          title: '视觉设计',
          status: 'doing',
          owner: '王五',
          children: [
            { id: '2-1-1', title: '色彩系统' },
            { id: '2-1-2', title: '图标设计' },
            { id: '2-1-3', title: '组件库' },
          ],
        },
        {
          id: '2-2',
          title: '交互设计',
          status: 'todo',
          owner: '赵六',
          children: [
            { id: '2-2-1', title: '手势方案' },
            { id: '2-2-2', title: '动画规范' },
            { id: '2-2-3', title: '导航结构' },
          ],
        },
      ],
    },
    {
      id: '3',
      title: '功能开发',
      status: 'doing',
      owner: '孙七',
      children: [
        {
          id: '3-1',
          title: '核心引擎',
          status: 'doing',
          owner: '孙七',
          children: [
            {
              id: '3-1-1',
              title: '数据结构',
              children: [
                { id: '3-1-1-1', title: '节点模型' },
                { id: '3-1-1-2', title: '关系映射' },
              ],
            },
            { id: '3-1-2', title: '渲染引擎' },
            { id: '3-1-3', title: '手势系统' },
          ],
        },
        {
          id: '3-2',
          title: '视图模式',
          status: 'todo',
          owner: '周八',
          children: [
            { id: '3-2-1', title: 'TreeTable' },
            { id: '3-2-2', title: 'MindMap' },
            { id: '3-2-3', title: '大纲视图' },
          ],
        },
        {
          id: '3-3',
          title: '云端同步',
          status: 'todo',
          owner: '吴九',
        },
      ],
    },
    {
      id: '4',
      title: '测试上线',
      status: 'todo',
      owner: '吴九',
      children: [
        {
          id: '4-1',
          title: '内测阶段',
          status: 'todo',
          owner: '吴九',
          children: [
            { id: '4-1-1', title: '功能测试' },
            { id: '4-1-2', title: '性能测试' },
          ],
        },
        {
          id: '4-2',
          title: 'App Store',
          status: 'todo',
          owner: '吴九',
        },
      ],
    },
  ],
};
