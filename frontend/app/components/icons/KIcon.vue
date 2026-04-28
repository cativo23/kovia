<script setup lang="ts">
import { computed } from 'vue'
import type { Component } from 'vue'
import ArrowLeft from './ArrowLeft.vue'
import ArrowRight from './ArrowRight.vue'
import ChevronLeft from './ChevronLeft.vue'
import ChevronRight from './ChevronRight.vue'
import ChevronUp from './ChevronUp.vue'
import LayoutDashboard from './LayoutDashboard.vue'
import LayoutGrid from './LayoutGrid.vue'
import List from './List.vue'
import MoreHorizontal from './MoreHorizontal.vue'
import AlertCircle from './AlertCircle.vue'
import Check from './Check.vue'
import CheckCircle from './CheckCircle.vue'
import CircleCheckBig from './CircleCheckBig.vue'
import Clock from './Clock.vue'
import Loader2 from './Loader2.vue'
import PartyPopper from './PartyPopper.vue'
import Shield from './Shield.vue'
import ShieldCheck from './ShieldCheck.vue'
import X from './X.vue'
import XCircle from './XCircle.vue'
import Bell from './Bell.vue'
import Facebook from './Facebook.vue'
import Instagram from './Instagram.vue'
import LogOut from './LogOut.vue'
import User from './User.vue'
import UserMinus from './UserMinus.vue'
import UserPlus from './UserPlus.vue'
import Users from './Users.vue'
import UsersRound from './UsersRound.vue'
import Baby from './Baby.vue'
import Cat from './Cat.vue'
import Dog from './Dog.vue'
import PawPrint from './PawPrint.vue'
import Ruler from './Ruler.vue'

const iconMap: Record<string, Component> = {
  'arrow-left': ArrowLeft,
  'arrow-right': ArrowRight,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  'chevron-up': ChevronUp,
  'layout-dashboard': LayoutDashboard,
  'layout-grid': LayoutGrid,
  'list': List,
  'more-horizontal': MoreHorizontal,
  'alert-circle': AlertCircle,
  'check': Check,
  'check-circle': CheckCircle,
  'circle-check-big': CircleCheckBig,
  'clock': Clock,
  'loader-2': Loader2,
  'party-popper': PartyPopper,
  'shield': Shield,
  'shield-check': ShieldCheck,
  'x': X,
  'x-circle': XCircle,
  'bell': Bell,
  'facebook': Facebook,
  'instagram': Instagram,
  'log-out': LogOut,
  'user': User,
  'user-minus': UserMinus,
  'user-plus': UserPlus,
  'users': Users,
  'users-round': UsersRound,
  'baby': Baby,
  'cat': Cat,
  'dog': Dog,
  'paw-print': PawPrint,
  'ruler': Ruler,
}

const props = withDefaults(
  defineProps<{ name: string; size?: number; class?: string }>(),
  { size: 24 },
)

const resolved = computed(() => iconMap[props.name])
</script>

<template>
  <component
    v-if="resolved"
    :is="resolved"
    :width="size"
    :height="size"
    role="img"
    aria-hidden="true"
    :class="$props.class"
  />
  <span
    v-else
    :data-kicon-missing="name"
    :style="{ display: 'inline-block', width: `${size}px`, height: `${size}px`, border: '1px dashed currentColor' }"
    role="img"
    :aria-label="`Missing icon: ${name}`"
  />
</template>
